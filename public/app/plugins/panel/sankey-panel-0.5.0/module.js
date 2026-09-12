/*! For license information please see module.js.LICENSE.txt */
define(['react', 'd3', '@grafana/data', '@grafana/ui'], function (t, e, n, r) {
  return (function (t) {
    var e = {};
    function n(r) {
      if (e[r]) return e[r].exports;
      var o = (e[r] = { i: r, l: !1, exports: {} });
      return t[r].call(o.exports, o, o.exports, n), (o.l = !0), o.exports;
    }
    return (
      (n.m = t),
      (n.c = e),
      (n.d = function (t, e, r) {
        n.o(t, e) || Object.defineProperty(t, e, { enumerable: !0, get: r });
      }),
      (n.r = function (t) {
        'undefined' != typeof Symbol &&
          Symbol.toStringTag &&
          Object.defineProperty(t, Symbol.toStringTag, { value: 'Module' }),
          Object.defineProperty(t, '__esModule', { value: !0 });
      }),
      (n.t = function (t, e) {
        if ((1 & e && (t = n(t)), 8 & e)) return t;
        if (4 & e && 'object' == typeof t && t && t.__esModule) return t;
        var r = Object.create(null);
        if ((n.r(r), Object.defineProperty(r, 'default', { enumerable: !0, value: t }), 2 & e && 'string' != typeof t))
          for (var o in t)
            n.d(
              r,
              o,
              function (e) {
                return t[e];
              }.bind(null, o)
            );
        return r;
      }),
      (n.n = function (t) {
        var e =
          t && t.__esModule
            ? function () {
                return t.default;
              }
            : function () {
                return t;
              };
        return n.d(e, 'a', e), e;
      }),
      (n.o = function (t, e) {
        return Object.prototype.hasOwnProperty.call(t, e);
      }),
      (n.p = '/'),
      n((n.s = 5))
    );
  })([
    function (e, n) {
      e.exports = t;
    },
    function (t, n) {
      t.exports = e;
    },
    function (t, e) {
      t.exports = n;
    },
    function (t, e) {
      t.exports = r;
    },
    ,
    function (t, e, n) {
      'use strict';
      n.r(e);
      var r = {};
      n.r(r),
        n.d(r, 'sankey', function () {
          return M;
        }),
        n.d(r, 'sankeyCenter', function () {
          return v;
        }),
        n.d(r, 'sankeyLeft', function () {
          return g;
        }),
        n.d(r, 'sankeyRight', function () {
          return p;
        }),
        n.d(r, 'sankeyJustify', function () {
          return _;
        }),
        n.d(r, 'sankeyLinkHorizontal', function () {
          return q;
        });
      var o = n(2);
      var i = function () {
        return (i =
          Object.assign ||
          function (t) {
            for (var e, n = 1, r = arguments.length; n < r; n++)
              for (var o in (e = arguments[n])) Object.prototype.hasOwnProperty.call(e, o) && (t[o] = e[o]);
            return t;
          }).apply(this, arguments);
      };
      function a(t, e) {
        var n = {};
        for (var r in t) Object.prototype.hasOwnProperty.call(t, r) && e.indexOf(r) < 0 && (n[r] = t[r]);
        if (null != t && 'function' == typeof Object.getOwnPropertySymbols) {
          var o = 0;
          for (r = Object.getOwnPropertySymbols(t); o < r.length; o++)
            e.indexOf(r[o]) < 0 && Object.prototype.propertyIsEnumerable.call(t, r[o]) && (n[r[o]] = t[r[o]]);
        }
        return n;
      }
      function s(t, e) {
        var n = 'function' == typeof Symbol && t[Symbol.iterator];
        if (!n) return t;
        var r,
          o,
          i = n.call(t),
          a = [];
        try {
          for (; (void 0 === e || e-- > 0) && !(r = i.next()).done; ) a.push(r.value);
        } catch (t) {
          o = { error: t };
        } finally {
          try {
            r && !r.done && (n = i.return) && n.call(i);
          } finally {
            if (o) throw o.error;
          }
        }
        return a;
      }
      var u = n(0),
        l = n.n(u),
        c = n(1);
      function f(t, e) {
        let n = 0;
        if (void 0 === e) for (let e of t) (e = +e) && (n += e);
        else {
          let r = -1;
          for (let o of t) (o = +e(o, ++r, t)) && (n += o);
        }
        return n;
      }
      function h(t, e) {
        let n;
        if (void 0 === e) for (const e of t) null != e && (n < e || (void 0 === n && e >= e)) && (n = e);
        else {
          let r = -1;
          for (let o of t) null != (o = e(o, ++r, t)) && (n < o || (void 0 === n && o >= o)) && (n = o);
        }
        return n;
      }
      function d(t, e) {
        let n;
        if (void 0 === e) for (const e of t) null != e && (n > e || (void 0 === n && e >= e)) && (n = e);
        else {
          let r = -1;
          for (let o of t) null != (o = e(o, ++r, t)) && (n > o || (void 0 === n && o >= o)) && (n = o);
        }
        return n;
      }
      function y(t) {
        return t.target.depth;
      }
      function g(t) {
        return t.depth;
      }
      function p(t, e) {
        return e - 1 - t.height;
      }
      function _(t, e) {
        return t.sourceLinks.length ? t.depth : e - 1;
      }
      function v(t) {
        return t.targetLinks.length ? t.depth : t.sourceLinks.length ? d(t.sourceLinks, y) - 1 : 0;
      }
      function k(t) {
        return function () {
          return t;
        };
      }
      function m(t, e) {
        return x(t.source, e.source) || t.index - e.index;
      }
      function b(t, e) {
        return x(t.target, e.target) || t.index - e.index;
      }
      function x(t, e) {
        return t.y0 - e.y0;
      }
      function w(t) {
        return t.value;
      }
      function S(t) {
        return t.index;
      }
      function L(t) {
        return t.nodes;
      }
      function A(t) {
        return t.links;
      }
      function O(t, e) {
        const n = t.get(e);
        if (!n) throw new Error('missing: ' + e);
        return n;
      }
      function j({ nodes: t }) {
        for (const e of t) {
          let t = e.y0,
            n = t;
          for (const n of e.sourceLinks) (n.y0 = t + n.width / 2), (t += n.width);
          for (const t of e.targetLinks) (t.y1 = n + t.width / 2), (n += t.width);
        }
      }
      function M() {
        let t,
          e,
          n,
          r = 0,
          o = 0,
          i = 1,
          a = 1,
          s = 24,
          u = 8,
          l = S,
          c = _,
          y = L,
          g = A,
          p = 6;
        function v() {
          const t = { nodes: y.apply(null, arguments), links: g.apply(null, arguments) };
          return M(t), T(t), V(t), P(t), E(t), j(t), t;
        }
        function M({ nodes: t, links: e }) {
          for (const [e, n] of t.entries()) (n.index = e), (n.sourceLinks = []), (n.targetLinks = []);
          const r = new Map(t.map((e, n) => [l(e, n, t), e]));
          for (const [t, n] of e.entries()) {
            n.index = t;
            let { source: e, target: o } = n;
            'object' != typeof e && (e = n.source = O(r, e)),
              'object' != typeof o && (o = n.target = O(r, o)),
              e.sourceLinks.push(n),
              o.targetLinks.push(n);
          }
          if (null != n) for (const { sourceLinks: e, targetLinks: r } of t) e.sort(n), r.sort(n);
        }
        function T({ nodes: t }) {
          for (const e of t)
            e.value = void 0 === e.fixedValue ? Math.max(f(e.sourceLinks, w), f(e.targetLinks, w)) : e.fixedValue;
        }
        function V({ nodes: t }) {
          const e = t.length;
          let n = new Set(t),
            r = new Set(),
            o = 0;
          for (; n.size; ) {
            for (const t of n) {
              t.depth = o;
              for (const { target: e } of t.sourceLinks) r.add(e);
            }
            if (++o > e) throw new Error('circular link');
            (n = r), (r = new Set());
          }
        }
        function P({ nodes: t }) {
          const e = t.length;
          let n = new Set(t),
            r = new Set(),
            o = 0;
          for (; n.size; ) {
            for (const t of n) {
              t.height = o;
              for (const { source: e } of t.targetLinks) r.add(e);
            }
            if (++o > e) throw new Error('circular link');
            (n = r), (r = new Set());
          }
        }
        function E(n) {
          const l = (function ({ nodes: t }) {
            const n = h(t, (t) => t.depth) + 1,
              o = (i - r - s) / (n - 1),
              a = new Array(n);
            for (const e of t) {
              const t = Math.max(0, Math.min(n - 1, Math.floor(c.call(null, e, n))));
              (e.layer = t), (e.x0 = r + t * o), (e.x1 = e.x0 + s), a[t] ? a[t].push(e) : (a[t] = [e]);
            }
            if (e) for (const t of a) t.sort(e);
            return a;
          })(n);
          (t = Math.min(u, (a - o) / (h(l, (t) => t.length) - 1))),
            (function (e) {
              const n = d(e, (e) => (a - o - (e.length - 1) * t) / f(e, w));
              for (const r of e) {
                let e = o;
                for (const o of r) {
                  (o.y0 = e), (o.y1 = e + o.value * n), (e = o.y1 + t);
                  for (const t of o.sourceLinks) t.width = t.value * n;
                }
                e = (a - e + t) / (r.length + 1);
                for (let t = 0; t < r.length; ++t) {
                  const n = r[t];
                  (n.y0 += e * (t + 1)), (n.y1 += e * (t + 1));
                }
                J(r);
              }
            })(l);
          for (let t = 0; t < p; ++t) {
            const e = Math.pow(0.99, t),
              n = Math.max(1 - e, (t + 1) / p);
            N(l, e, n), C(l, e, n);
          }
        }
        function C(t, n, r) {
          for (let o = 1, i = t.length; o < i; ++o) {
            const i = t[o];
            for (const t of i) {
              let e = 0,
                r = 0;
              for (const { source: n, value: o } of t.targetLinks) {
                let i = o * (t.layer - n.layer);
                (e += G(n, t) * i), (r += i);
              }
              if (!(r > 0)) continue;
              let o = (e / r - t.y0) * n;
              (t.y0 += o), (t.y1 += o), F(t);
            }
            void 0 === e && i.sort(x), B(i, r);
          }
        }
        function N(t, n, r) {
          for (let o = t.length - 2; o >= 0; --o) {
            const i = t[o];
            for (const t of i) {
              let e = 0,
                r = 0;
              for (const { target: n, value: o } of t.sourceLinks) {
                let i = o * (n.layer - t.layer);
                (e += I(t, n) * i), (r += i);
              }
              if (!(r > 0)) continue;
              let o = (e / r - t.y0) * n;
              (t.y0 += o), (t.y1 += o), F(t);
            }
            void 0 === e && i.sort(x), B(i, r);
          }
        }
        function B(e, n) {
          const r = e.length >> 1,
            i = e[r];
          z(e, i.y0 - t, r - 1, n), H(e, i.y1 + t, r + 1, n), z(e, a, e.length - 1, n), H(e, o, 0, n);
        }
        function H(e, n, r, o) {
          for (; r < e.length; ++r) {
            const i = e[r],
              a = (n - i.y0) * o;
            a > 1e-6 && ((i.y0 += a), (i.y1 += a)), (n = i.y1 + t);
          }
        }
        function z(e, n, r, o) {
          for (; r >= 0; --r) {
            const i = e[r],
              a = (i.y1 - n) * o;
            a > 1e-6 && ((i.y0 -= a), (i.y1 -= a)), (n = i.y0 - t);
          }
        }
        function F({ sourceLinks: t, targetLinks: e }) {
          if (void 0 === n) {
            for (const {
              source: { sourceLinks: t },
            } of e)
              t.sort(b);
            for (const {
              target: { targetLinks: e },
            } of t)
              e.sort(m);
          }
        }
        function J(t) {
          if (void 0 === n) for (const { sourceLinks: e, targetLinks: n } of t) e.sort(b), n.sort(m);
        }
        function G(e, n) {
          let r = e.y0 - ((e.sourceLinks.length - 1) * t) / 2;
          for (const { target: o, width: i } of e.sourceLinks) {
            if (o === n) break;
            r += i + t;
          }
          for (const { source: t, width: o } of n.targetLinks) {
            if (t === e) break;
            r -= o;
          }
          return r;
        }
        function I(e, n) {
          let r = n.y0 - ((n.targetLinks.length - 1) * t) / 2;
          for (const { source: o, width: i } of n.targetLinks) {
            if (o === e) break;
            r += i + t;
          }
          for (const { target: t, width: o } of e.sourceLinks) {
            if (t === n) break;
            r -= o;
          }
          return r;
        }
        return (
          (v.update = function (t) {
            return j(t), t;
          }),
          (v.nodeId = function (t) {
            return arguments.length ? ((l = 'function' == typeof t ? t : k(t)), v) : l;
          }),
          (v.nodeAlign = function (t) {
            return arguments.length ? ((c = 'function' == typeof t ? t : k(t)), v) : c;
          }),
          (v.nodeSort = function (t) {
            return arguments.length ? ((e = t), v) : e;
          }),
          (v.nodeWidth = function (t) {
            return arguments.length ? ((s = +t), v) : s;
          }),
          (v.nodePadding = function (e) {
            return arguments.length ? ((u = t = +e), v) : u;
          }),
          (v.nodes = function (t) {
            return arguments.length ? ((y = 'function' == typeof t ? t : k(t)), v) : y;
          }),
          (v.links = function (t) {
            return arguments.length ? ((g = 'function' == typeof t ? t : k(t)), v) : g;
          }),
          (v.linkSort = function (t) {
            return arguments.length ? ((n = t), v) : n;
          }),
          (v.size = function (t) {
            return arguments.length ? ((r = o = 0), (i = +t[0]), (a = +t[1]), v) : [i - r, a - o];
          }),
          (v.extent = function (t) {
            return arguments.length
              ? ((r = +t[0][0]), (i = +t[1][0]), (o = +t[0][1]), (a = +t[1][1]), v)
              : [
                  [r, o],
                  [i, a],
                ];
          }),
          (v.iterations = function (t) {
            return arguments.length ? ((p = +t), v) : p;
          }),
          v
        );
      }
      var T = Math.PI,
        V = 2 * T,
        P = V - 1e-6;
      function E() {
        (this._x0 = this._y0 = this._x1 = this._y1 = null), (this._ = '');
      }
      function C() {
        return new E();
      }
      E.prototype = C.prototype = {
        constructor: E,
        moveTo: function (t, e) {
          this._ += 'M' + (this._x0 = this._x1 = +t) + ',' + (this._y0 = this._y1 = +e);
        },
        closePath: function () {
          null !== this._x1 && ((this._x1 = this._x0), (this._y1 = this._y0), (this._ += 'Z'));
        },
        lineTo: function (t, e) {
          this._ += 'L' + (this._x1 = +t) + ',' + (this._y1 = +e);
        },
        quadraticCurveTo: function (t, e, n, r) {
          this._ += 'Q' + +t + ',' + +e + ',' + (this._x1 = +n) + ',' + (this._y1 = +r);
        },
        bezierCurveTo: function (t, e, n, r, o, i) {
          this._ += 'C' + +t + ',' + +e + ',' + +n + ',' + +r + ',' + (this._x1 = +o) + ',' + (this._y1 = +i);
        },
        arcTo: function (t, e, n, r, o) {
          (t = +t), (e = +e), (n = +n), (r = +r), (o = +o);
          var i = this._x1,
            a = this._y1,
            s = n - t,
            u = r - e,
            l = i - t,
            c = a - e,
            f = l * l + c * c;
          if (o < 0) throw new Error('negative radius: ' + o);
          if (null === this._x1) this._ += 'M' + (this._x1 = t) + ',' + (this._y1 = e);
          else if (f > 1e-6)
            if (Math.abs(c * s - u * l) > 1e-6 && o) {
              var h = n - i,
                d = r - a,
                y = s * s + u * u,
                g = h * h + d * d,
                p = Math.sqrt(y),
                _ = Math.sqrt(f),
                v = o * Math.tan((T - Math.acos((y + f - g) / (2 * p * _))) / 2),
                k = v / _,
                m = v / p;
              Math.abs(k - 1) > 1e-6 && (this._ += 'L' + (t + k * l) + ',' + (e + k * c)),
                (this._ +=
                  'A' +
                  o +
                  ',' +
                  o +
                  ',0,0,' +
                  +(c * h > l * d) +
                  ',' +
                  (this._x1 = t + m * s) +
                  ',' +
                  (this._y1 = e + m * u));
            } else this._ += 'L' + (this._x1 = t) + ',' + (this._y1 = e);
          else;
        },
        arc: function (t, e, n, r, o, i) {
          (t = +t), (e = +e), (i = !!i);
          var a = (n = +n) * Math.cos(r),
            s = n * Math.sin(r),
            u = t + a,
            l = e + s,
            c = 1 ^ i,
            f = i ? r - o : o - r;
          if (n < 0) throw new Error('negative radius: ' + n);
          null === this._x1
            ? (this._ += 'M' + u + ',' + l)
            : (Math.abs(this._x1 - u) > 1e-6 || Math.abs(this._y1 - l) > 1e-6) && (this._ += 'L' + u + ',' + l),
            n &&
              (f < 0 && (f = (f % V) + V),
              f > P
                ? (this._ +=
                    'A' +
                    n +
                    ',' +
                    n +
                    ',0,1,' +
                    c +
                    ',' +
                    (t - a) +
                    ',' +
                    (e - s) +
                    'A' +
                    n +
                    ',' +
                    n +
                    ',0,1,' +
                    c +
                    ',' +
                    (this._x1 = u) +
                    ',' +
                    (this._y1 = l))
                : f > 1e-6 &&
                  (this._ +=
                    'A' +
                    n +
                    ',' +
                    n +
                    ',0,' +
                    +(f >= T) +
                    ',' +
                    c +
                    ',' +
                    (this._x1 = t + n * Math.cos(o)) +
                    ',' +
                    (this._y1 = e + n * Math.sin(o))));
        },
        rect: function (t, e, n, r) {
          this._ +=
            'M' + (this._x0 = this._x1 = +t) + ',' + (this._y0 = this._y1 = +e) + 'h' + +n + 'v' + +r + 'h' + -n + 'Z';
        },
        toString: function () {
          return this._;
        },
      };
      var N = C,
        B = Array.prototype.slice,
        H = function (t) {
          return function () {
            return t;
          };
        };
      function z(t) {
        return t[0];
      }
      function F(t) {
        return t[1];
      }
      function J(t) {
        return t.source;
      }
      function G(t) {
        return t.target;
      }
      function I(t) {
        var e = J,
          n = G,
          r = z,
          o = F,
          i = null;
        function a() {
          var a,
            s = B.call(arguments),
            u = e.apply(this, s),
            l = n.apply(this, s);
          if (
            (i || (i = a = N()),
            t(
              i,
              +r.apply(this, ((s[0] = u), s)),
              +o.apply(this, s),
              +r.apply(this, ((s[0] = l), s)),
              +o.apply(this, s)
            ),
            a)
          )
            return (i = null), a + '' || null;
        }
        return (
          (a.source = function (t) {
            return arguments.length ? ((e = t), a) : e;
          }),
          (a.target = function (t) {
            return arguments.length ? ((n = t), a) : n;
          }),
          (a.x = function (t) {
            return arguments.length ? ((r = 'function' == typeof t ? t : H(+t)), a) : r;
          }),
          (a.y = function (t) {
            return arguments.length ? ((o = 'function' == typeof t ? t : H(+t)), a) : o;
          }),
          (a.context = function (t) {
            return arguments.length ? ((i = null == t ? null : t), a) : i;
          }),
          a
        );
      }
      function D(t, e, n, r, o) {
        t.moveTo(e, n), t.bezierCurveTo((e = (e + r) / 2), n, e, o, r, o);
      }
      function R(t) {
        return [t.source.x1, t.y0];
      }
      function W(t) {
        return [t.target.x0, t.y1];
      }
      var q = function () {
        return I(D).source(R).target(W);
      };
      function U(t, e) {
        for (var n = 0; n < e.length; n++) {
          var r = e[n];
          (r.enumerable = r.enumerable || !1),
            (r.configurable = !0),
            'value' in r && (r.writable = !0),
            Object.defineProperty(t, r.key, r);
        }
      }
      var Z = 'total',
        Q = 'percentage',
        K = 'both',
        X = 'none',
        Y = 'path',
        $ = 'input',
        tt = 'output',
        et = (function () {
          function t(e, n) {
            !(function (t, e) {
              if (!(t instanceof e)) throw new TypeError('Cannot call a class as a function');
            })(this, t),
              (this._svg = e),
              (this._container = n || e),
              (this._gBound = null),
              (this._data = null),
              (this._nodes = null),
              (this._links = null),
              (this._width = 0),
              (this._height = 0),
              (this._boundedWidth = 0),
              (this._boundedHeight = 0),
              (this._marginTop = 20),
              (this._marginRight = 20),
              (this._marginBottom = 20),
              (this._marginLeft = 20),
              (this._background = 'rgba(0, 0, 0, 0)'),
              (this._edgeColor = 'path'),
              (this._colorScheme = 'Tableau10'),
              (this._colorScale = null),
              (this._colorArray = ''),
              (this._sankeyAlignType = 'Justify'),
              (this._sankeyAlign = null),
              (this._sankeyGenerator = null),
              (this._sankeyNodeWith = 110),
              (this._sankeyNodePadding = 20),
              (this._svgNode = null),
              (this._svgLink = null),
              (this._displayValues = 'none'),
              (this._highlightOnHover = !1);
          }
          var e, n, o;
          return (
            (e = t),
            (n = [
              {
                key: '_init',
                value: function () {
                  this._setBoundDimensions(), this._setColorScale(), this._configureSankey(), this._calculateSankey();
                },
              },
              {
                key: '_setBoundDimensions',
                value: function () {
                  (this._boundedWidth = this._width - this._marginLeft - this._marginRight),
                    (this._boundedHeight = this._height - this._marginTop - this._marginBottom);
                },
              },
              {
                key: '_setColorScale',
                value: function () {
                  this._colorScale = c.scaleOrdinal(c['scheme'.concat(this._colorScheme)]);
                },
              },
              {
                key: '_color',
                value: function (t) {
                  return this._colorScale(t.name);
                },
              },
              {
                key: '_configureSankey',
                value: function () {
                  (this._sankeyAlign = r['sankey'.concat(this._sankeyAlignType)]),
                    (this._sankeyGenerator = M()
                      .nodeId(function (t) {
                        return t.name;
                      })
                      .nodeAlign(this._sankeyAlign)
                      .nodeWidth(this._sankeyNodeWith)
                      .nodePadding(this._sankeyNodePadding)
                      .extent([
                        [0, 0],
                        [this._boundedWidth, this._boundedHeight],
                      ]));
                },
              },
              {
                key: '_calculateSankey',
                value: function () {
                  var t = this._sankeyGenerator({
                    nodes: this._data.nodes.map(function (t) {
                      return Object.assign({}, t);
                    }),
                    links: this._data.links.map(function (t) {
                      return Object.assign({}, t);
                    }),
                  });
                  (this._nodes = t.nodes.filter(function (t) {
                    return 0 !== t.value;
                  })),
                    (this._links = t.links.filter(function (t) {
                      return 0 !== t.value;
                    }));
                },
              },
              {
                key: '_validate',
                value: function () {
                  return (
                    this._data &&
                    this._data.nodes &&
                    this._data.links &&
                    this._data.nodes.length > 0 &&
                    this._data.links.length > 0
                  );
                },
              },
              {
                key: '_setLinkGradient',
                value: function () {
                  var t = this,
                    e = this._svgLink
                      .append('linearGradient')
                      .attr('id', function (t) {
                        return (t.uid = 'link-'.concat(t.index, '-').concat(Math.random()));
                      })
                      .attr('gradientUnits', 'userSpaceOnUse')
                      .attr('x1', function (t) {
                        return t.source.x1;
                      })
                      .attr('x2', function (t) {
                        return t.target.x0;
                      });
                  e
                    .append('stop')
                    .attr('offset', '0%')
                    .attr('stop-color', function (e) {
                      return t._color(e.source);
                    }),
                    e
                      .append('stop')
                      .attr('offset', '100%')
                      .attr('stop-color', function (e) {
                        return t._color(e.target);
                      });
                },
              },
              {
                key: '_setLinkStroke',
                value: function (t) {
                  switch (this._edgeColor) {
                    case X:
                      return '#aaa';
                    case Y:
                      return 'url(#'.concat(t.uid, ')');
                    case $:
                      return this._color(t.source);
                    case tt:
                      return this._color(t.target);
                    default:
                      return;
                  }
                },
              },
              {
                key: '_showLinks',
                value: function (t) {
                  var e = [];
                  [
                    { linkType: 'sourceLinks', nodeType: 'target' },
                    { linkType: 'targetLinks', nodeType: 'source' },
                  ].forEach(function (n) {
                    t[n.linkType].forEach(function (t) {
                      e.push(t[n.nodeType]);
                    });
                  }),
                    this._gBound.selectAll('.sankey-node').style('opacity', function (n) {
                      return t.name === n.name ||
                        e.find(function (t) {
                          return t.name === n.name;
                        })
                        ? '1'
                        : '0.2';
                    }),
                    this._gBound.selectAll('.sankey-link').style('opacity', function (e) {
                      return !e || (e.source.name !== t.name && e.target.name !== t.name) ? '0.2' : '1';
                    });
                },
              },
              {
                key: '_showAll',
                value: function () {
                  this._gBound.selectAll('.sankey-node').style('opacity', '1'),
                    this._gBound.selectAll('.sankey-link').style('opacity', '1');
                },
              },
              {
                key: '_formatValue',
                value: function (t) {
                  return c.format('.2~f')(t);
                },
              },
              {
                key: '_formatPercent',
                value: function (t) {
                  return c.format('.2~%')(t);
                },
              },
              {
                key: '_formatThousand',
                value: function (t) {
                  return c.format('.3~s')(t);
                },
              },
              {
                key: '_labelNodeValue',
                value: function (t) {
                  var e = this._nodes.filter(function (e) {
                      return e.depth === t.depth;
                    }),
                    n = c.sum(e, function (t) {
                      return t.value;
                    }),
                    r = this._formatThousand(t.value),
                    o = this._formatPercent(t.value / n),
                    i = '';
                  switch (this._displayValues) {
                    case Z:
                      i = ''.concat(r);
                      break;
                    case Q:
                      i = ''.concat(o);
                      break;
                    case K:
                      i = ''.concat(o, ' - ').concat(r);
                  }
                  return i;
                },
              },
              {
                key: '_renderSVG',
                value: function () {
                  var t = this;
                  this._container.style('background-color', this._background),
                    (this._gBound = this._container
                      .append('g')
                      .attr('transform', 'translate('.concat(this._marginLeft, ', ').concat(this._marginTop, ')'))),
                    (this._svgNode = this._gBound
                      .append('g')
                      .attr('stroke', '#000')
                      .selectAll('.sankey-node')
                      .data(this._nodes, function (t) {
                        return t.name;
                      })
                      .join('rect')
                      .attr('class', 'sankey-node')
                      .attr('id', function (t) {
                        return t.name;
                      })
                      .attr('x', function (t) {
                        return t.x0;
                      })
                      .attr('y', function (t) {
                        return t.y0;
                      })
                      .attr('rx', 2)
                      .attr('ry', 2)
                      .attr('height', function (t) {
                        return t.y1 - t.y0;
                      })
                      .attr('width', function (t) {
                        return t.x1 - t.x0;
                      })
                      .attr('stroke', function (e) {
                        var n = JSON.parse(t._colorArray);
                        return Object.keys(n).includes(e.name) ? n[e.name] : 'rgba(148, 153, 168, 1)';
                      })
                      .attr('fill', function (e) {
                        var n = JSON.parse(t._colorArray);
                        return Object.keys(n).includes(e.name) ? n[e.name] : 'rgba(148, 153, 168, 1)';
                      })
                      .on('mouseover', function (e) {
                        var n;
                        return (
                          t._highlightOnHover &&
                          t._showLinks(null === (n = e.target) || void 0 === n ? void 0 : n.__data__)
                        );
                      })
                      .on('mouseout', function (e) {
                        return t._highlightOnHover && t._showAll();
                      })),
                    (this._svgLink = this._gBound
                      .append('g')
                      .attr('fill', 'none')
                      .attr('stroke-opacity', 0.3)
                      .selectAll('g')
                      .data(this._links, function (t) {
                        return ''.concat(t.source.name, '-').concat(t.target.name);
                      })
                      .join('g')
                      .style('mix-blend-mode', 'multiply')),
                    'path' === this._edgeColor && this._setLinkGradient(),
                    this._svgLink
                      .append('path')
                      .attr('class', 'sankey-link')
                      .attr('d', q())
                      .attr('stroke', 'rgba(182, 185, 196, 1)')
                      .attr('stroke-width', function (t) {
                        return Math.max(1, t.width);
                      }),
                    this._gBound
                      .append('g')
                      .attr('font-family', 'sans-serif')
                      .attr('font-size', 10)
                      .selectAll('text')
                      .data(this._nodes)
                      .join('text')
                      .attr('x', function (t) {
                        return t.x0 + 8;
                      })
                      .attr('y', function (t) {
                        return (t.y1 + t.y0) / 2;
                      })
                      .attr('dy', '0.35em')
                      .text(function (t) {
                        return t.name;
                      }),
                    this._gBound
                      .append('g')
                      .attr('font-family', 'sans-serif')
                      .attr('font-size', 10)
                      .selectAll('text')
                      .data(this._nodes)
                      .join('text')
                      .attr('x', function (t) {
                        return t.x0 + 8;
                      })
                      .attr('font-size', 14)
                      .attr('font-weight', '700')
                      .attr('y', function (t) {
                        return (t.y1 + t.y0) / 2 + 16;
                      })
                      .attr('dy', '0.35em')
                      .text(function (e) {
                        return t._labelNodeValue(e);
                      }),
                    this._svgNode.append('title').text(function (e) {
                      return ''.concat(e.name, '\n').concat(t._formatValue(e.value));
                    }),
                    this._svgLink.append('title').text(function (e) {
                      return ''
                        .concat(e.source.name, ' → ')
                        .concat(e.target.name, '\n')
                        .concat(t._formatValue(e.value));
                    });
                },
              },
              {
                key: 'data',
                value: function (t) {
                  return arguments.length ? ((this._data = t), this) : this._data;
                },
              },
              {
                key: 'width',
                value: function (t) {
                  return arguments.length ? ((this._width = +t), this) : this._width;
                },
              },
              {
                key: 'height',
                value: function (t) {
                  return arguments.length ? ((this._height = +t), this) : this._height;
                },
              },
              {
                key: 'align',
                value: function (t) {
                  return arguments.length ? ((this._sankeyAlignType = t), this) : this._sankeyAlignType;
                },
              },
              {
                key: 'colorScheme',
                value: function (t) {
                  return arguments.length ? ((this._colorScheme = t), this) : this._colorScheme;
                },
              },
              {
                key: 'colorArray',
                value: function (t) {
                  return arguments.length ? ((this._colorArray = t), this) : this._colorArray;
                },
              },
              {
                key: 'edgeColor',
                value: function (t) {
                  return arguments.length ? ((this._edgeColor = t), this) : this._edgeColor;
                },
              },
              {
                key: 'displayValues',
                value: function (t) {
                  return arguments.length ? ((this._displayValues = t), this) : this._displayValues;
                },
              },
              {
                key: 'highlightOnHover',
                value: function (t) {
                  return arguments.length ? ((this._highlightOnHover = t), this) : this._highlightOnHover;
                },
              },
              {
                key: 'render',
                value: function () {
                  return this._validate() && (this._init(), this._renderSVG()), this;
                },
              },
            ]) && U(e.prototype, n),
            o && U(e, o),
            t
          );
        })(),
        nt = n(3),
        rt = function (t) {
          var e = t.message;
          return l.a.createElement(
            'p',
            { style: ot },
            l.a.createElement(
              'div',
              { style: it },
              l.a.createElement(nt.Icon, { name: 'exclamation-triangle' }),
              l.a.createElement('div', { style: at }, e)
            )
          );
        },
        ot = { height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' },
        it = {
          padding: '15px 20px',
          marginBottom: '4px',
          position: 'relative',
          color: 'rgb(255, 255, 255)',
          textShadow: 'rgb(0 0 0 / 20%) 0px 1px 0px',
          borderRadius: '3px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          background: 'linear-gradient(90deg, rgb(224, 47, 68), rgb(224, 47, 68))',
        },
        at = { marginLeft: 10 },
        st = (function (t) {
          void 0 === t && (t = !0);
          if (!t)
            return {
              warn: function () {
                for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
              },
              error: function () {
                for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
              },
              log: function () {
                for (var t = [], e = 0; e < arguments.length; e++) t[e] = arguments[e];
              },
            };
          return { warn: console.warn, error: console.error, log: console.log };
        })();
      var ut = function (t) {
        var e = t.options,
          n = t.data,
          r = t.width,
          o = t.height,
          i = { source: 'source', target: 'target', value: 'value' },
          a = 'Required fields not present: ' + Object.keys(i).join(', '),
          f = s(Object(u.useState)({ isError: !1, message: '' }), 2),
          h = f[0],
          d = f[1],
          y = s(Object(u.useState)({ nodes: [], links: [] }), 2),
          g = y[0],
          p = y[1];
        Object(u.useEffect)(
          function () {
            n.error && st.warn('[FN] Sankey data error.', { data: n, error: n.error }),
              n.error ? d({ isError: !0, message: n.error.message }) : p(_());
          },
          [n]
        );
        var _ = function () {
            var t = n.series[0],
              e = t.fields.find(function (t) {
                return t.name === i.source;
              }),
              r = t.fields.find(function (t) {
                return t.name === i.target;
              }),
              o = t.fields.find(function (t) {
                return t.name === i.value;
              }),
              s = null == e ? void 0 : e.values.toArray(),
              u = null == r ? void 0 : r.values.toArray(),
              l = null == o ? void 0 : o.values.toArray();
            if (
              (function (t, e, n) {
                var r = !0;
                if (!(t && e && n)) return d({ isError: !0, message: a }), !1;
                var o = t.every(function (t) {
                    return 'string' == typeof t;
                  }),
                  i = e.every(function (t) {
                    return 'string' == typeof t;
                  }),
                  s = n.every(function (t) {
                    return 'number' == typeof t;
                  });
                return o && i && s
                  ? (d({}), r)
                  : (d({
                      isError: !0,
                      message:
                        'Fields should have the following types: source (string), target (string), value (numeric)',
                    }),
                    !1);
              })(s, u, l)
            ) {
              var f = c.zip(s, u, l);
              return {
                nodes: Array.from(new Set(s.concat(u))).map(function (t) {
                  return { name: t };
                }),
                links: f.map(function (t) {
                  return { source: t[0], target: t[1], value: +t[2].toFixed(2) };
                }),
              };
            }
          },
          v = function (t) {
            var n = new et(t)
              .width(r)
              .height(o)
              .align(e.align)
              .edgeColor(e.edgeColor)
              .colorScheme(e.colorScheme)
              .displayValues(e.displayValues)
              .highlightOnHover(e.highlightOnHover)
              .colorArray(e.colorArray)
              .data(g);
            try {
              n.render();
            } catch (t) {
              st.warn('[FN] Sankey render error.', { renderError: t, graph: g }),
                d({ isError: !0, message: t.message });
            }
          };
        return h.isError
          ? l.a.createElement(rt, { message: h.message })
          : l.a.createElement('svg', {
              viewBox: '0 0 ' + r + ' ' + o,
              ref: function (t) {
                c.select(t).selectAll('*').remove(), c.select(t).call(v);
              },
            });
      };
      function lt() {
        return function (t) {
          var e = t.series,
            n = a(t, ['series']),
            r = e.map(function (t) {
              return Object(o.toDataFrame)(
                i(i({}, t), {
                  fields: t.fields.map(function (t, e, n) {
                    var r,
                      a = ct.includes(t.name),
                      s =
                        t.values instanceof o.ArrayVector ||
                        'function' == typeof (null === (r = t.values) || void 0 === r ? void 0 : r.toArray),
                      u = Array.isArray(t.values);
                    if (!a || !t.values || (!u && !s)) return t;
                    var l = s ? t.values.toArray() : u ? t.values : null;
                    if (null === l)
                      return (
                        st.warn('[FN] Failed to transform sankey data.', 'Values are not an array.'),
                        i(i({}, t), { values: new o.ArrayVector([]) })
                      );
                    var c = a
                      ? l
                          .map(function (t) {
                            return 'string' == typeof t ? t.split('|') : t;
                          })[0]
                          .map(function (t, e, n) {
                            return Number.isNaN(Number(t)) ? t : Number(t);
                          })
                      : null;
                    try {
                      return i(i({}, t), {
                        type: (
                          null == c
                            ? void 0
                            : c.every(function (t) {
                                return 'number' == typeof t;
                              })
                        )
                          ? o.FieldType.number
                          : t.type,
                        values: c ? new o.ArrayVector(JSON.parse(JSON.stringify(c))) : l,
                      });
                    } catch (e) {
                      return (
                        st.warn('[FN] Failed to transform sankey data.', e instanceof Error ? e.message : String(e)),
                        i(i({}, t), { type: t.type, values: new o.ArrayVector([]) })
                      );
                    }
                  }),
                })
              );
            });
          return i({ series: r }, n);
        };
      }
      var ct = ['source', 'target', 'value'];
      n.d(e, 'plugin', function () {
        return ft;
      });
      var ft = new o.PanelPlugin(function (t) {
        var e = t.data,
          n = a(t, ['data']),
          r = Object(u.useMemo)(lt, []),
          o = Object(u.useMemo)(
            function () {
              return r(e);
            },
            [r, e]
          );
        return l.a.createElement(ut, i({}, i(i({}, n), { data: o })));
      }).setPanelOptions(function (t) {
        return t
          .addSelect({
            path: 'align',
            name: 'Align',
            defaultValue: 'Justify',
            settings: {
              options: [
                { value: 'Justify', label: 'Justify' },
                { value: 'Left', label: 'Left' },
                { value: 'Right', label: 'Right' },
                { value: 'Center', label: 'Center' },
              ],
            },
          })
          .addTextInput({ path: 'colorArray', name: 'Color Object', defaultValue: '' })
          .addSelect({
            path: 'colorScheme',
            name: 'Color',
            defaultValue: 'Tableau10',
            settings: {
              options: [
                { value: 'Tableau10', label: 'Tableau10' },
                { value: 'Category10', label: 'Category10' },
                { value: 'Accent', label: 'Accent' },
                { value: 'Dark2', label: 'Dark2' },
                { value: 'Paired', label: 'Paired' },
                { value: 'Pastel1', label: 'Pastel1' },
                { value: 'Pastel2', label: 'Pastel2' },
                { value: 'Set1', label: 'Set1' },
                { value: 'Set2', label: 'Set2' },
                { value: 'Set3', label: 'Set3' },
              ],
            },
          })
          .addSelect({
            path: 'edgeColor',
            name: 'Edge Color',
            defaultValue: 'path',
            settings: {
              options: [
                { value: 'path', label: 'input-output' },
                { value: 'input', label: 'input' },
                { value: 'output', label: 'output' },
                { value: 'none', label: 'none' },
              ],
            },
          })
          .addSelect({
            path: 'displayValues',
            name: 'Display Values',
            defaultValue: 'none',
            settings: {
              options: [
                { value: 'total', label: 'Totals' },
                { value: 'percentage', label: 'Percentages' },
                { value: 'both', label: 'Both' },
                { value: 'none', label: 'None' },
              ],
            },
          })
          .addBooleanSwitch({
            path: 'highlightOnHover',
            name: 'Highlight connections on node hover',
            defaultValue: !1,
          });
      });
    },
  ]);
});
//# sourceMappingURL=module.js.map
