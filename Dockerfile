# syntax=docker/dockerfile:1

# alpine:3.19.1 shipped openssl 3.1.4-r5, flagged CRITICAL for CVE-2024-5535
# on the deployed grafana-internal image (VULN-233).
#
# Alpine 3.19 reached end of support on 2025-11-01 and is now "on request"
# only, so it receives no routine security updates. It also has no fixed
# openssl package for CVE-2026-31789 -- that fix landed upstream in 3.0.20 /
# 3.3.7 / 3.4.5 / 3.5.6+, none of which are backported to the 3.19 branch.
# Staying on 3.19 therefore cannot resolve VULN-233 in full.
#
# 3.23 is a supported branch (EOL 2027-11-01) carrying openssl 3.5.x, which is
# past the CVE-2026-31789 fix. Pinning the branch tag rather than a patch tag
# keeps this on the newest published 3.23.x.
ARG BASE_IMAGE=alpine:3.23
ARG JS_IMAGE=node:20-alpine
ARG JS_PLATFORM=linux/amd64
ARG GO_IMAGE=golang:1.25.14-alpine

ARG GO_SRC=go-builder
ARG JS_SRC=js-builder

FROM --platform=${JS_PLATFORM} ${JS_IMAGE} as js-builder

ENV NODE_OPTIONS=--max_old_space_size=8000

WORKDIR /tmp/grafana

COPY package.json project.json nx.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages packages
COPY plugins-bundled plugins-bundled
COPY e2e/test-plugins e2e/test-plugins
COPY public public
COPY LICENSE ./
COPY conf/defaults.ini ./conf/defaults.ini

RUN apk add --no-cache make build-base python3 py3-setuptools

# Browser tests run outside the Alpine production image.
RUN CYPRESS_INSTALL_BINARY=0 NX_DAEMON=false npm_config_nodedir=/usr/local yarn install --inline-builds

COPY tsconfig.json .eslintrc .editorconfig .browserslistrc .prettierrc.js ./
COPY scripts scripts
COPY emails emails

ENV NODE_ENV production
RUN yarn build

FROM ${GO_IMAGE} as go-builder

ARG COMMIT_SHA=""
ARG BUILD_BRANCH=""
ARG GO_BUILD_TAGS="oss"
ARG WIRE_TAGS="oss"
# BINGO=false by default: the image build only runs `make build-go`, which needs
# no .bingo-managed tool. Building them all pulled golangci-lint v1.60.1, whose
# golang.org/x/tools v0.24.0 fails to compile on Go >= 1.25 (invalid array length
# in internal/tokeninternal). Set BINGO=true only where those tools are needed.
ARG BINGO="false"

RUN if grep -i -q alpine /etc/issue; then \
      apk add --no-cache \
          # This is required to allow building on arm64 due to https://github.com/golang/go/issues/22040
          binutils-gold \
          bash \
          # Install build dependencies
          gcc g++ make git; \
    fi

WORKDIR /tmp/grafana

COPY go.* ./
COPY .bingo .bingo

# Include vendored dependencies
COPY pkg/util/xorm/go.* pkg/util/xorm/
COPY pkg/apiserver/go.* pkg/apiserver/
COPY pkg/apimachinery/go.* pkg/apimachinery/
COPY pkg/build/go.* pkg/build/
COPY pkg/build/wire/go.* pkg/build/wire/
COPY pkg/promlib/go.* pkg/promlib/
COPY pkg/storage/unified/resource/go.* pkg/storage/unified/resource/
COPY pkg/storage/unified/apistore/go.* pkg/storage/unified/apistore/
COPY pkg/semconv/go.* pkg/semconv/
COPY pkg/aggregator/go.* pkg/aggregator/

RUN go mod download
RUN if [[ "$BINGO" = "true" ]]; then \
      go install github.com/bwplotka/bingo@latest && \
      bingo get -v; \
    fi

COPY embed.go Makefile build.go package.json ./
COPY cue.mod cue.mod
COPY kinds kinds
COPY local local
COPY packages/grafana-schema packages/grafana-schema
COPY public/app/plugins public/app/plugins
COPY public/api-merged.json public/api-merged.json
COPY pkg pkg
COPY scripts scripts
COPY conf conf
COPY .github .github

ENV COMMIT_SHA=${COMMIT_SHA}
ENV BUILD_BRANCH=${BUILD_BRANCH}

RUN make build-go GO_BUILD_TAGS=${GO_BUILD_TAGS} WIRE_TAGS=${WIRE_TAGS}

FROM ${BASE_IMAGE} as tgz-builder

WORKDIR /tmp/grafana

ARG GRAFANA_TGZ="grafana-latest.linux-x64-musl.tar.gz"

COPY ${GRAFANA_TGZ} /tmp/grafana.tar.gz

# add -v to make tar print every file it extracts
RUN tar x -z -f /tmp/grafana.tar.gz --strip-components=1

# helpers for COPY --from
FROM ${GO_SRC} as go-src
FROM ${JS_SRC} as js-src

# Final stage
FROM ${BASE_IMAGE}

LABEL maintainer="Grafana Labs <hello@grafana.com>"

ARG GF_UID="472"
ARG GF_GID="0"

ENV PATH="/usr/share/grafana/bin:$PATH" \
    GF_PATHS_CONFIG="/etc/grafana/grafana.ini" \
    GF_PATHS_DATA="/var/lib/grafana" \
    GF_PATHS_HOME="/usr/share/grafana" \
    GF_PATHS_LOGS="/var/log/grafana" \
    GF_PATHS_PLUGINS="/var/lib/grafana/plugins" \
    GF_PATHS_PROVISIONING="/etc/grafana/provisioning"

WORKDIR $GF_PATHS_HOME

# Install dependencies
#
# `apk upgrade` is deliberate: the published alpine:3.23 image lags its own
# repository, so it still ships openssl 3.5.7-r0 while 3.23-main already has
# 3.5.8-r0 (fixes CVE-2026-14456). Upgrading here picks up whatever the branch
# has published at build time instead of pinning to the image snapshot.
RUN if grep -i -q alpine /etc/issue; then \
      apk upgrade --no-cache && \
      apk add --no-cache ca-certificates bash curl tzdata musl-utils && \
      apk info -vv | sort; \
    elif grep -i -q ubuntu /etc/issue; then \
      DEBIAN_FRONTEND=noninteractive && \
      apt-get update && \
      apt-get install -y ca-certificates curl tzdata musl && \
      apt-get autoremove -y && \
      rm -rf /var/lib/apt/lists/*; \
    else \
      echo 'ERROR: Unsupported base image' && /bin/false; \
    fi

# glibc support for alpine x86_64 only
RUN if grep -i -q alpine /etc/issue && [ `arch` = "x86_64" ]; then \
      wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://alpine-pkgs.sgerrand.com/sgerrand.rsa.pub && \
      wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.35-r0/glibc-2.35-r0.apk \
        -O /tmp/glibc-2.35-r0.apk && \
      wget https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.35-r0/glibc-bin-2.35-r0.apk \
        -O /tmp/glibc-bin-2.35-r0.apk && \
      apk add --force-overwrite --no-cache /tmp/glibc-2.35-r0.apk /tmp/glibc-bin-2.35-r0.apk && \
      rm -f /lib64/ld-linux-x86-64.so.2 && \
      ln -s /usr/glibc-compat/lib64/ld-linux-x86-64.so.2 /lib64/ld-linux-x86-64.so.2 && \
      rm -f /tmp/glibc-2.35-r0.apk && \
      rm -f /tmp/glibc-bin-2.35-r0.apk && \
      rm -f /lib/ld-linux-x86-64.so.2 && \
      rm -f /etc/ld.so.cache; \
    fi

COPY --from=go-src /tmp/grafana/conf ./conf

RUN if [ ! $(getent group "$GF_GID") ]; then \
      if grep -i -q alpine /etc/issue; then \
        addgroup -S -g $GF_GID grafana; \
      else \
        addgroup --system --gid $GF_GID grafana; \
      fi; \
    fi && \
    GF_GID_NAME=$(getent group $GF_GID | cut -d':' -f1) && \
    mkdir -p "$GF_PATHS_HOME/.aws" && \
    if grep -i -q alpine /etc/issue; then \
      adduser -S -u $GF_UID -G "$GF_GID_NAME" grafana; \
    else \
      adduser --system --uid $GF_UID --ingroup "$GF_GID_NAME" grafana; \
    fi && \
    mkdir -p "$GF_PATHS_PROVISIONING/datasources" \
             "$GF_PATHS_PROVISIONING/dashboards" \
             "$GF_PATHS_PROVISIONING/notifiers" \
             "$GF_PATHS_PROVISIONING/plugins" \
             "$GF_PATHS_PROVISIONING/access-control" \
             "$GF_PATHS_PROVISIONING/alerting" \
             "$GF_PATHS_LOGS" \
             "$GF_PATHS_PLUGINS" \
             "$GF_PATHS_DATA" && \
    cp conf/sample.ini "$GF_PATHS_CONFIG" && \
    cp conf/ldap.toml /etc/grafana/ldap.toml && \
    chown -R "grafana:$GF_GID_NAME" "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING" && \
    chmod -R 777 "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING"

COPY --from=go-src /tmp/grafana/bin/grafana* /tmp/grafana/bin/*/grafana* ./bin/
COPY --from=js-src /tmp/grafana/public ./public
COPY --from=js-src /tmp/grafana/LICENSE ./

EXPOSE 3000

ARG RUN_SH=./packaging/docker/run.sh

COPY ${RUN_SH} /run.sh

USER "$GF_UID"
ENTRYPOINT [ "/run.sh" ]
