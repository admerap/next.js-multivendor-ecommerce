/* @ds-bundle: {"format":4,"namespace":"DesignSystem_cd889a","components":[{"name":"ProductCard","sourcePath":"components/commerce/ProductCard.jsx"},{"name":"SellerCard","sourcePath":"components/commerce/SellerCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"StarRating","sourcePath":"components/core/StarRating.jsx"},{"name":"Tabs","sourcePath":"components/core/Tabs.jsx"}],"sourceHashes":{"components/commerce/ProductCard.jsx":"e8b618be9c66","components/commerce/SellerCard.jsx":"ea8c830334c5","components/core/Badge.jsx":"9d7b049ea179","components/core/Button.jsx":"76ab0c8ceccd","components/core/Card.jsx":"fb28f2e85292","components/core/Input.jsx":"bc8a8be99c7d","components/core/StarRating.jsx":"a1292247a0c9","components/core/Tabs.jsx":"50694ed004ff","ui_kits/marketplace/home.data.js":"3e1c328a8ef0"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_cd889a = window.DesignSystem_cd889a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VAR = {
  discount: {
    background: "var(--error-50)",
    color: "var(--error-600)"
  },
  new: {
    background: "var(--success-50)",
    color: "var(--success-600)"
  },
  hot: {
    background: "var(--iris-50)",
    color: "var(--iris-700)"
  },
  accent: {
    background: "var(--saffron-100)",
    color: "var(--saffron-700)"
  },
  neutral: {
    background: "var(--surface-sunken)",
    color: "var(--text-body)"
  }
};
function Badge({
  variant = "hot",
  children,
  style,
  ...rest
}) {
  const s = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "var(--font-sans)",
    fontSize: 11.5,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "var(--radius-full)",
    letterSpacing: ".01em",
    ...VAR[variant],
    ...style
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: s
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 36,
    padding: "0 14px",
    fontSize: 13
  },
  md: {
    height: 44,
    padding: "0 20px",
    fontSize: 14.5
  },
  lg: {
    height: 52,
    padding: "0 28px",
    fontSize: 16
  }
};
const VARIANTS = {
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-on-primary)",
    boxShadow: "var(--shadow-xs)"
  },
  secondary: {
    background: "var(--surface-card)",
    color: "var(--text-strong)",
    border: "1px solid var(--border-subtle)"
  },
  ghost: {
    background: "transparent",
    color: "var(--text-body)"
  },
  accent: {
    background: "var(--color-accent)",
    color: "var(--neutral-900)"
  }
};
function Button({
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  iconLeft,
  iconRight,
  children,
  style,
  ...rest
}) {
  const s = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .5 : 1,
    width: block ? "100%" : "auto",
    whiteSpace: "nowrap",
    lineHeight: 1,
    border: "none",
    transition: "all var(--dur-fast) var(--ease-out)",
    ...SIZES[size],
    ...VARIANTS[variant],
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    style: s,
    disabled: disabled
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ELEV = {
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)"
};
function Card({
  elevation = "sm",
  pad = 20,
  bordered = true,
  children,
  style,
  ...rest
}) {
  const s = {
    background: "var(--surface-card)",
    borderRadius: "var(--radius-lg)",
    boxShadow: ELEV[elevation],
    padding: pad,
    border: bordered ? "1px solid var(--border-subtle)" : "none",
    ...style
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: s
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  iconLeft,
  addon,
  rounded = "md",
  style,
  ...rest
}) {
  const wrap = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 44,
    padding: "0 6px 0 14px",
    background: "var(--surface-sunken)",
    border: "1px solid var(--border-subtle)",
    borderRadius: rounded === "full" ? "var(--radius-full)" : "var(--radius-md)"
  };
  const input = {
    flex: 1,
    border: "none",
    background: "transparent",
    outline: "none",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    color: "var(--text-strong)",
    ...style
  };
  return /*#__PURE__*/React.createElement("div", {
    style: wrap
  }, iconLeft, /*#__PURE__*/React.createElement("input", _extends({
    style: input
  }, rest)), addon);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/StarRating.jsx
try { (() => {
function Star({
  filled,
  size
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: filled ? "var(--color-rating)" : "none",
    stroke: "var(--color-rating)",
    strokeWidth: "1.5",
    style: {
      opacity: filled ? 1 : .4
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"
  }));
}
function StarRating({
  value = 0,
  count,
  size = 14,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: 1
    }
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement(Star, {
    key: i,
    filled: i <= Math.round(value),
    size: size
  }))), count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: "var(--text-muted)",
      fontFamily: "var(--font-sans)"
    }
  }, "(", count, ")"));
}
Object.assign(__ds_scope, { StarRating });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StarRating.jsx", error: String((e && e.message) || e) }); }

// components/commerce/ProductCard.jsx
try { (() => {
const {
  useState
} = React;
const money = n => "$" + Number(n).toLocaleString("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
function Icon({
  name,
  size = 56,
  color
}) {
  const P = {
    heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z",
    cart: "M6 6h15l-1.5 9h-12z M6 6 5 3H2 M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
  };
  const d = P[name];
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color || "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: d
  }));
}
function ProductCard({
  title,
  seller,
  price,
  compare,
  rating = 0,
  reviews = 0,
  tag,
  tint = "var(--iris-50)",
  iconColor = "var(--iris-400)",
  image,
  glyph
}) {
  const [wish, setWish] = useState(false);
  const disc = compare ? Math.round((1 - price / compare) * 100) : 0;
  return /*#__PURE__*/React.createElement("article", {
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      background: "var(--surface-card)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
      overflow: "hidden",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      aspectRatio: "1/1",
      display: "grid",
      placeItems: "center",
      background: tint,
      overflow: "hidden"
    }
  }, disc > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 10,
      left: 10,
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: "discount"
  }, "\u2212", disc, "%")), tag && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 10,
      left: 10,
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: tag === "New" ? "new" : "hot"
  }, tag)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWish(w => !w),
    "aria-label": "Wishlist",
    style: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 34,
      height: 34,
      display: "grid",
      placeItems: "center",
      borderRadius: "var(--radius-full)",
      border: "none",
      cursor: "pointer",
      zIndex: 2,
      background: "rgba(255,255,255,.85)",
      backdropFilter: "blur(6px)",
      boxShadow: "var(--shadow-xs)",
      color: wish ? "var(--error-500)" : "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: wish ? "var(--error-500)" : "none",
    stroke: "currentColor",
    strokeWidth: "2"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l9 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"
  }))), image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: title,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement(Icon, {
    name: glyph || "cart",
    color: iconColor
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      display: "flex",
      flexDirection: "column",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--color-primary)",
      marginBottom: 4,
      textDecoration: "none"
    }
  }, seller), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.3,
      color: "var(--text-strong)",
      margin: "0 0 8px",
      minHeight: "2.5em"
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.StarRating, {
    value: rating,
    count: reviews,
    style: {
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      lineHeight: 1.15,
      fontVariantNumeric: "tabular-nums"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: "var(--text-strong)"
    }
  }, money(price)), compare && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      textDecoration: "line-through",
      color: "var(--text-compare)"
    }
  }, money(compare))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    style: {
      width: 36,
      padding: 0
    },
    "aria-label": "Add to cart"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cart",
    size: 16,
    color: "#fff"
  })))));
}
Object.assign(__ds_scope, { ProductCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/commerce/ProductCard.jsx", error: String((e && e.message) || e) }); }

// components/commerce/SellerCard.jsx
try { (() => {
function SellerCard({
  name,
  tagline,
  rating,
  reviews,
  products,
  tint = "var(--iris-50)",
  logo
}) {
  return /*#__PURE__*/React.createElement("article", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "var(--radius-lg)",
      display: "grid",
      placeItems: "center",
      background: tint,
      flexShrink: 0,
      overflow: "hidden"
    }
  }, logo ? /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement("svg", {
    width: "26",
    height: "26",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--color-primary)",
    strokeWidth: "1.8"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 9l1-5h16l1 5M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "var(--text-strong)",
      margin: 0,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, name), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "var(--color-primary)"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m9 12 2 2 4-4",
    stroke: "#fff",
    strokeWidth: "2",
    fill: "none"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10",
    fill: "var(--color-primary)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8 12 2.5 2.5L16 9",
    stroke: "#fff",
    strokeWidth: "2",
    fill: "none"
  }))), tagline && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: "hot"
  }, tagline)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 12,
      paddingTop: 10,
      borderTop: "1px solid var(--border-subtle)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StarRating, {
    value: rating,
    count: reviews
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--text-strong)"
    }
  }, products), " products")), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm",
    block: true
  }, "Visit store"));
}
Object.assign(__ds_scope, { SellerCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/commerce/SellerCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Tabs.jsx
try { (() => {
const {
  useState
} = React;
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  style
}) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const active = value ?? internal;
  const pick = v => {
    setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      ...style
    }
  }, tabs.map(t => {
    const on = t.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      onClick: () => pick(t.value),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 600,
        borderRadius: "var(--radius-full)",
        cursor: "pointer",
        border: on ? "1px solid transparent" : "1px solid var(--border-subtle)",
        background: on ? "var(--color-primary)" : "var(--surface-card)",
        color: on ? "#fff" : "var(--text-body)",
        transition: "all var(--dur-fast) var(--ease-out)"
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketplace/home.data.js
try { (() => {
/* Sundry Home — data + render logic. Real content only. */
(function () {
  const T = {
    // category tints: [bg, icon]
    tech: ['var(--iris-50)', 'var(--iris-400)'],
    phone: ['#EDF1FE', '#6B86E8'],
    women: ['#FCEEF3', '#D976A0'],
    beauty: ['#FDEFF4', '#DB7BA6'],
    home: ['#EEF4F0', '#5FA37E'],
    kids: ['#FEF6E7', '#E0A93F'],
    men: ['#EEF1F6', '#7086A8'],
    audio: ['#F0EEFB', '#8B72E0'],
    jewel: ['#FBF3E8', '#C79A54'],
    sport: ['#EAF5F2', '#4FA394']
  };
  const money = n => '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const stars = r => {
    let s = '';
    for (let i = 1; i <= 5; i++) {
      s += `<i data-lucide="star" class="w-3.5 h-3.5 rating-star" ${i <= Math.round(r) ? 'style="fill:var(--color-rating)"' : 'style="fill:none;opacity:.35"'}></i>`;
    }
    return s;
  };
  function card(p) {
    const disc = p.compare ? Math.round((1 - p.price / p.compare) * 100) : 0;
    const [bg, ic] = T[p.cat] || T.tech;
    return `<article class="pcard flex flex-col">
      <div class="pcard-imgwrap" style="background:${bg}">
        ${disc > 0 ? `<span class="badge badge-discount" style="position:absolute;top:10px;left:10px;z-index:2">−${disc}%</span>` : ''}
        ${p.tag ? `<span class="badge ${p.tag === 'New' ? 'badge-new' : 'badge-hot'}" style="position:absolute;top:10px;left:10px;z-index:2">${p.tag}</span>` : ''}
        <button class="wish" aria-label="Add to wishlist"><i data-lucide="heart" class="w-4 h-4"></i></button>
        <div class="pcard-img"><i data-lucide="${p.icon}" style="width:56px;height:56px;color:${ic}"></i></div>
      </div>
      <div class="p-3.5 flex flex-col flex-1">
        <a href="#" class="text-[11px] font-semibold mb-1 flex items-center gap-1" style="color:var(--color-primary)"><i data-lucide="store" class="w-3 h-3"></i>${p.seller}</a>
        <h3 class="text-sm font-semibold leading-snug mb-2 line-clamp-2" style="color:var(--text-strong);min-height:2.5em">${p.title}</h3>
        <div class="flex items-center gap-1.5 mb-2.5">
          <span class="flex">${stars(p.rating)}</span>
          <span class="text-[11px]" style="color:var(--text-muted)">(${p.reviews})</span>
        </div>
        <div class="mt-auto flex items-end justify-between gap-2">
          <div class="flex flex-col leading-tight">
            <span class="text-[15px] font-extrabold tnum" style="color:var(--text-price)">${money(p.price)}</span>
            ${p.compare ? `<span class="text-xs line-through tnum" style="color:var(--text-compare)">${money(p.compare)}</span>` : ''}
          </div>
          <button class="pcard-cart btn btn-primary btn-sm w-9 !px-0 shrink-0" aria-label="Add to cart"><i data-lucide="shopping-cart" class="w-4 h-4"></i></button>
        </div>
      </div>
    </article>`;
  }

  // ---------- DATA ----------
  const flash = [{
    title: 'iPhone 15 Pro Max 256GB',
    seller: 'Hanover Electronics',
    price: 1149,
    compare: 1399,
    rating: 4.8,
    reviews: 214,
    icon: 'smartphone',
    cat: 'phone'
  }, {
    title: 'Ruby Matte Lipstick Set',
    seller: 'Bloom Beauty Co.',
    price: 32,
    compare: 58,
    rating: 4.6,
    reviews: 98,
    icon: 'sparkles',
    cat: 'beauty'
  }, {
    title: 'Leather Structured Tote',
    seller: 'Maison Ardent',
    price: 159,
    compare: 249,
    rating: 4.9,
    reviews: 64,
    icon: 'shopping-bag',
    cat: 'women'
  }, {
    title: 'Galaxy S24 Ultra 512GB',
    seller: 'Hanover Electronics',
    price: 1159,
    compare: 1499,
    rating: 4.7,
    reviews: 180,
    icon: 'smartphone',
    cat: 'phone'
  }, {
    title: 'Aura Noise-Cancel Headphones',
    seller: 'Sundry Audio',
    price: 189,
    compare: 329,
    rating: 4.8,
    reviews: 342,
    icon: 'headphones',
    cat: 'audio'
  }];
  const featured = [{
    title: 'Botanical Moisturizing Cream',
    seller: 'Bloom Beauty Co.',
    price: 14,
    rating: 4.5,
    reviews: 41,
    icon: 'sparkles',
    cat: 'beauty'
  }, {
    title: 'Terra Woven Market Bag',
    seller: 'Maison Ardent',
    price: 29,
    rating: 4.7,
    reviews: 22,
    icon: 'shopping-bag',
    cat: 'women'
  }, {
    title: 'Pulse Smart Watch, 46mm',
    seller: 'Hanover Electronics',
    price: 120,
    compare: 170,
    rating: 4.6,
    reviews: 88,
    icon: 'watch',
    cat: 'tech'
  }, {
    title: "Halo Women's Smart Watch",
    seller: 'Nova Wearables',
    price: 86,
    compare: 110,
    rating: 4.4,
    reviews: 57,
    icon: 'watch',
    cat: 'women',
    tag: 'New'
  }, {
    title: 'Galaxy S24 Ultra 512GB',
    seller: 'Hanover Electronics',
    price: 1159,
    rating: 4.7,
    reviews: 180,
    icon: 'smartphone',
    cat: 'phone'
  }, {
    title: 'Vortex Electric Table Blender',
    seller: 'Copper & Oak',
    price: 59,
    rating: 4.3,
    reviews: 34,
    icon: 'blender',
    cat: 'home'
  }];
  const deals = [{
    title: 'MagSafe Portable Charger 10K',
    seller: 'Hanover Electronics',
    price: 24,
    compare: 49,
    icon: 'battery-charging',
    cat: 'tech'
  }, {
    title: 'Kayak Pro Running Shoe',
    seller: 'Stride Athletics',
    price: 139,
    compare: 189,
    icon: 'footprints',
    cat: 'sport'
  }, {
    title: 'Voyage Backpack for Women',
    seller: 'Maison Ardent',
    price: 97,
    compare: 150,
    icon: 'backpack',
    cat: 'women'
  }, {
    title: 'Lumen LED Cabinet Strip',
    seller: 'Copper & Oak',
    price: 45,
    compare: 65,
    icon: 'lightbulb',
    cat: 'home'
  }];
  const sellers = [{
    name: 'Hanover Electronics',
    tag: 'Top rated',
    rating: 4.9,
    reviews: 194,
    products: 20,
    icon: 'cpu',
    cat: 'tech'
  }, {
    name: 'Bloom Beauty Co.',
    tag: 'Rising star',
    rating: 4.7,
    reviews: 128,
    products: 64,
    icon: 'flower-2',
    cat: 'beauty'
  }, {
    name: 'Maison Ardent',
    tag: 'Premium seller',
    rating: 4.8,
    reviews: 210,
    products: 41,
    icon: 'gem',
    cat: 'women'
  }, {
    name: 'Copper & Oak',
    tag: 'Best in home',
    rating: 4.6,
    reviews: 96,
    products: 88,
    icon: 'sofa',
    cat: 'home'
  }];
  const latest = [{
    title: 'Precision Cylinder Head',
    seller: 'AutoWorks Depot',
    price: 909,
    icon: 'wrench',
    cat: 'tech'
  }, {
    title: 'Combo Trailer Light Set',
    seller: 'AutoWorks Depot',
    price: 35,
    icon: 'lightbulb',
    cat: 'tech'
  }, {
    title: 'Waterproof Seat Protector',
    seller: 'AutoWorks Depot',
    price: 28,
    icon: 'car-front',
    cat: 'tech'
  }, {
    title: 'HP-Series Crank Sensor',
    seller: 'AutoWorks Depot',
    price: 2909,
    icon: 'gauge',
    cat: 'tech'
  }, {
    title: 'Interior LED Light Bar',
    seller: 'AutoWorks Depot',
    price: 20,
    icon: 'lightbulb',
    cat: 'tech'
  }, {
    title: 'Lug White Spoke Wheel',
    seller: 'AutoWorks Depot',
    price: 60,
    icon: 'circle-dot',
    cat: 'tech'
  }, {
    title: 'Storage Large Tool Box',
    seller: 'AutoWorks Depot',
    price: 56,
    icon: 'toolbox',
    cat: 'tech'
  }, {
    title: 'Bolt Mechanic 120-pc Kit',
    seller: 'AutoWorks Depot',
    price: 80,
    icon: 'wrench',
    cat: 'tech'
  }];
  const arrivals = [{
    title: 'Signet Alloy Dress Ring',
    seller: 'Aurelia Fine Jewelry',
    price: 69,
    rating: 4.6,
    reviews: 12,
    icon: 'gem',
    cat: 'jewel',
    tag: 'New'
  }, {
    title: 'French Door Refrigerator',
    seller: 'Copper & Oak',
    price: 2049,
    rating: 4.5,
    reviews: 9,
    icon: 'refrigerator',
    cat: 'home',
    tag: 'New'
  }, {
    title: 'Sneaker Bound White',
    seller: 'Stride Athletics',
    price: 79,
    rating: 4.4,
    reviews: 15,
    icon: 'footprints',
    cat: 'sport',
    tag: 'New'
  }, {
    title: 'Retrograde Slim Tee',
    seller: 'North Loop Apparel',
    price: 22,
    rating: 4.3,
    reviews: 20,
    icon: 'shirt',
    cat: 'men',
    tag: 'New'
  }, {
    title: 'Copper Alloy Hoop Earrings',
    seller: 'Aurelia Fine Jewelry',
    price: 39,
    rating: 4.7,
    reviews: 8,
    icon: 'gem',
    cat: 'jewel',
    tag: 'New'
  }, {
    title: 'Leather Ladies Handbag',
    seller: 'Maison Ardent',
    price: 129,
    rating: 4.8,
    reviews: 11,
    icon: 'shopping-bag',
    cat: 'women',
    tag: 'New'
  }];
  const pop = {
    best: featured.concat(flash.slice(0, 3).map(p => ({
      ...p,
      compare: 0
    }))).slice(0, 6),
    rated: arrivals,
    trend: flash.map(p => ({
      ...p
    })).concat(deals.map(d => ({
      ...d,
      rating: 4.5,
      reviews: 30
    }))).slice(0, 6)
  };
  const cats = [{
    name: "Men's Fashion",
    icon: 'shirt',
    cat: 'men'
  }, {
    name: "Women's Fashion",
    icon: 'shopping-bag',
    cat: 'women'
  }, {
    name: "Kid's Fashion",
    icon: 'baby',
    cat: 'kids'
  }, {
    name: 'Health & Beauty',
    icon: 'sparkles',
    cat: 'beauty'
  }, {
    name: 'Home & Kitchen',
    icon: 'sofa',
    cat: 'home'
  }, {
    name: 'Phones & Gadgets',
    icon: 'smartphone',
    cat: 'phone'
  }, {
    name: 'Electronics',
    icon: 'cpu',
    cat: 'tech'
  }, {
    name: 'Sports & Fitness',
    icon: 'dumbbell',
    cat: 'sport'
  }];
  const brands = ['Hanover', 'Maison A.', 'Bloom', 'Copper&Oak', 'Aurelia', 'Stride', 'North Loop', 'Nova'];
  const railDefs = [{
    t: "Women's Fashion",
    items: [{
      title: "Beaded Mini Dress",
      seller: 'Maison Ardent',
      price: 70,
      rating: 4.5,
      reviews: 11,
      icon: 'shopping-bag',
      cat: 'women'
    }, {
      title: "Leather Single Shoes",
      seller: 'Stride Athletics',
      price: 32,
      rating: 4.2,
      reviews: 7,
      icon: 'footprints',
      cat: 'women'
    }, {
      title: 'Handbag Bags Premium',
      seller: 'Maison Ardent',
      price: 50,
      compare: 80,
      rating: 4.7,
      reviews: 19,
      icon: 'shopping-bag',
      cat: 'women'
    }, {
      title: 'Kimono Wrap Blouse',
      seller: 'North Loop Apparel',
      price: 283,
      rating: 4.4,
      reviews: 5,
      icon: 'shirt',
      cat: 'women'
    }, {
      title: 'Blue 18K Gold Necklace',
      seller: 'Aurelia Fine Jewelry',
      price: 39,
      rating: 4.8,
      reviews: 9,
      icon: 'gem',
      cat: 'jewel'
    }]
  }, {
    t: 'Phones & Gadgets',
    items: [{
      title: 'iPhone 12 Pro 128GB',
      seller: 'Hanover Electronics',
      price: 598,
      rating: 4.6,
      reviews: 44,
      icon: 'smartphone',
      cat: 'phone'
    }, {
      title: 'Galaxy A54 Smartphone',
      seller: 'Hanover Electronics',
      price: 449,
      rating: 4.4,
      reviews: 31,
      icon: 'smartphone',
      cat: 'phone'
    }, {
      title: 'iPhone 13 Pro 256GB',
      seller: 'Hanover Electronics',
      price: 820,
      rating: 4.7,
      reviews: 52,
      icon: 'smartphone',
      cat: 'phone'
    }, {
      title: 'iPhone 15 Pro Max',
      seller: 'Hanover Electronics',
      price: 1249,
      rating: 4.9,
      reviews: 88,
      icon: 'smartphone',
      cat: 'phone'
    }, {
      title: 'Galaxy S24 Ultra',
      seller: 'Hanover Electronics',
      price: 1189,
      rating: 4.7,
      reviews: 67,
      icon: 'smartphone',
      cat: 'phone'
    }]
  }, {
    t: 'Health & Beauty',
    items: [{
      title: 'Botanical Long Cream',
      seller: 'Bloom Beauty Co.',
      price: 14,
      rating: 4.5,
      reviews: 23,
      icon: 'sparkles',
      cat: 'beauty'
    }, {
      title: 'Renew Facial Cleanser',
      seller: 'Bloom Beauty Co.',
      price: 12,
      rating: 4.3,
      reviews: 18,
      icon: 'droplet',
      cat: 'beauty'
    }, {
      title: 'Hydra Moisturizing Cream',
      seller: 'Bloom Beauty Co.',
      price: 15,
      rating: 4.6,
      reviews: 29,
      icon: 'sparkles',
      cat: 'beauty'
    }, {
      title: 'Quercetinol Cleansing Oil',
      seller: 'Bloom Beauty Co.',
      price: 10,
      rating: 4.2,
      reviews: 14,
      icon: 'droplet',
      cat: 'beauty'
    }, {
      title: 'Vitamin-C Sunscreen Serum',
      seller: 'Bloom Beauty Co.',
      price: 14,
      rating: 4.7,
      reviews: 41,
      icon: 'sun',
      cat: 'beauty'
    }]
  }, {
    t: 'Electronics & Gadgets',
    items: [{
      title: 'Aurora 15 Pro Laptop',
      seller: 'Hanover Electronics',
      price: 2200,
      rating: 4.6,
      reviews: 33,
      icon: 'laptop',
      cat: 'tech'
    }, {
      title: 'ZK Mac Book Air 13"',
      seller: 'Hanover Electronics',
      price: 3150,
      compare: 3600,
      rating: 4.8,
      reviews: 52,
      icon: 'laptop',
      cat: 'tech'
    }, {
      title: 'Pro Wireless Earbuds',
      seller: 'Sundry Audio',
      price: 47,
      rating: 4.4,
      reviews: 61,
      icon: 'ear',
      cat: 'audio'
    }, {
      title: 'Notebook Laptop 14"',
      seller: 'Hanover Electronics',
      price: 459,
      rating: 4.3,
      reviews: 27,
      icon: 'laptop',
      cat: 'tech'
    }, {
      title: 'Studio Over-Ear Headset',
      seller: 'Sundry Audio',
      price: 24,
      compare: 40,
      rating: 4.5,
      reviews: 38,
      icon: 'headphones',
      cat: 'audio'
    }]
  }, {
    t: 'Home & Kitchen',
    items: [{
      title: 'Oak TV Stand Cabinet',
      seller: 'Copper & Oak',
      price: 428,
      rating: 4.5,
      reviews: 16,
      icon: 'sofa',
      cat: 'home'
    }, {
      title: 'Bookcase Wood Library',
      seller: 'Copper & Oak',
      price: 850,
      compare: 940,
      rating: 4.7,
      reviews: 21,
      icon: 'library-big',
      cat: 'home'
    }, {
      title: 'Modular Media Cabinet',
      seller: 'Copper & Oak',
      price: 1200,
      rating: 4.6,
      reviews: 9,
      icon: 'sofa',
      cat: 'home'
    }, {
      title: 'Cast-Iron Fireplace Stove',
      seller: 'Copper & Oak',
      price: 283,
      rating: 4.4,
      reviews: 12,
      icon: 'flame',
      cat: 'home'
    }, {
      title: 'Wide Storage Cabinet',
      seller: 'Copper & Oak',
      price: 190,
      rating: 4.3,
      reviews: 7,
      icon: 'archive',
      cat: 'home'
    }]
  }, {
    t: "Men's Fashion",
    items: [{
      title: 'Retrograde Slim Shirt',
      seller: 'North Loop Apparel',
      price: 25,
      rating: 4.3,
      reviews: 20,
      icon: 'shirt',
      cat: 'men'
    }, {
      title: 'Sherpa Loafers for Men',
      seller: 'Stride Athletics',
      price: 159,
      rating: 4.5,
      reviews: 14,
      icon: 'footprints',
      cat: 'men'
    }, {
      title: "Men's Leather Belt",
      seller: 'North Loop Apparel',
      price: 19,
      rating: 4.2,
      reviews: 11,
      icon: 'circle',
      cat: 'men'
    }, {
      title: 'Pulse Smart Watch, Black',
      seller: 'Nova Wearables',
      price: 159,
      rating: 4.6,
      reviews: 33,
      icon: 'watch',
      cat: 'men'
    }, {
      title: 'Kayak Pro Running Shoe',
      seller: 'Stride Athletics',
      price: 170,
      compare: 210,
      rating: 4.7,
      reviews: 41,
      icon: 'footprints',
      cat: 'sport'
    }]
  }, {
    t: "Kid's Fashion",
    items: [{
      title: 'Sprout Sneaker Mesh',
      seller: 'Little Loop',
      price: 19,
      rating: 4.4,
      reviews: 8,
      icon: 'footprints',
      cat: 'kids'
    }, {
      title: 'Daily Casual Kids Shoes',
      seller: 'Little Loop',
      price: 29,
      rating: 4.3,
      reviews: 6,
      icon: 'footprints',
      cat: 'kids'
    }, {
      title: 'Petite Print Dress',
      seller: 'Little Loop',
      price: 22,
      rating: 4.6,
      reviews: 12,
      icon: 'shirt',
      cat: 'kids'
    }, {
      title: 'Splash Romper Jumpsuit',
      seller: 'Little Loop',
      price: 18,
      rating: 4.5,
      reviews: 9,
      icon: 'baby',
      cat: 'kids'
    }, {
      title: 'Sunny Sandals, Coral',
      seller: 'Little Loop',
      price: 14,
      rating: 4.2,
      reviews: 5,
      icon: 'footprints',
      cat: 'kids'
    }]
  }];

  // ---------- RENDER ----------
  const $ = s => document.querySelector(s);
  const fill = (sel, arr) => {
    const el = $(sel);
    if (el) el.innerHTML = arr.map(card).join('');
  };
  fill('#flashRail', flash);
  fill('#featuredRail', featured);
  fill('#latestRail', latest);
  fill('#newRail', arrivals);
  fill('#popRail', pop.best);
  $('#dealRail').innerHTML = deals.map(d => {
    const disc = Math.round((1 - d.price / d.compare) * 100);
    const [bg, ic] = T[d.cat] || T.tech;
    return `<article class="card p-4 flex items-center gap-4" style="border:1px solid var(--border-subtle)">
    <div class="w-20 h-20 rounded-[var(--radius-md)] grid place-items-center shrink-0" style="background:${bg}"><i data-lucide="${d.icon}" style="width:36px;height:36px;color:${ic}"></i></div>
    <div class="min-w-0"><span class="badge badge-discount mb-1">−${disc}%</span>
      <h3 class="text-sm font-semibold leading-snug truncate" style="color:var(--text-strong)">${d.title}</h3>
      <p class="text-[11px] mb-1" style="color:var(--color-primary)">${d.seller}</p>
      <div class="flex items-baseline gap-2"><span class="font-bold tnum" style="color:var(--text-strong)">${money(d.price)}</span><span class="text-xs line-through tnum" style="color:var(--text-compare)">${money(d.compare)}</span></div>
    </div></article>`;
  }).join('');
  $('#sellerRail').innerHTML = sellers.map(s => {
    const [bg, ic] = T[s.cat] || T.tech;
    return `<article class="card p-5 flex flex-col gap-3" style="border:1px solid var(--border-subtle)">
    <div class="flex items-center gap-3">
      <div class="w-14 h-14 rounded-[var(--radius-lg)] grid place-items-center shrink-0" style="background:${bg}"><i data-lucide="${s.icon}" style="width:26px;height:26px;color:${ic}"></i></div>
      <div class="min-w-0"><div class="flex items-center gap-1.5"><h3 class="font-bold text-sm truncate" style="color:var(--text-strong)">${s.name}</h3><i data-lucide="badge-check" class="w-4 h-4 shrink-0" style="color:var(--color-primary)"></i></div>
      <span class="badge badge-hot mt-0.5">${s.tag}</span></div>
    </div>
    <div class="flex items-center justify-between text-xs pt-2" style="border-top:1px solid var(--border-subtle);color:var(--text-muted)">
      <span class="flex items-center gap-1"><i data-lucide="star" class="w-3.5 h-3.5 rating-star" style="fill:var(--color-rating)"></i><b style="color:var(--text-strong)">${s.rating}</b> (${s.reviews})</span>
      <span><b style="color:var(--text-strong)">${s.products}</b> products</span>
    </div>
    <button class="btn btn-secondary btn-sm w-full">Visit store</button></article>`;
  }).join('');
  $('#catTiles').innerHTML = cats.map(c => {
    const [bg, ic] = T[c.cat] || T.tech;
    return `<a href="#" class="flex flex-col items-center gap-2.5 group">
    <div class="w-full aspect-square rounded-[var(--radius-lg)] grid place-items-center transition-transform group-hover:scale-[1.04]" style="background:${bg};box-shadow:var(--shadow-xs)"><i data-lucide="${c.icon}" style="width:40px;height:40px;color:${ic}"></i></div>
    <span class="text-xs font-semibold text-center leading-tight" style="color:var(--text-body)">${c.name}</span></a>`;
  }).join('');
  $('#brandRow').innerHTML = brands.map(b => `<div class="card grid place-items-center h-20 px-4" style="border:1px solid var(--border-subtle)"><span class="font-display font-bold text-base tracking-tight" style="color:var(--neutral-400)">${b}</span></div>`).join('');
  $('#catRails').innerHTML = railDefs.map(r => `<section class="container-x pt-14">
    <div class="flex items-end justify-between mb-5"><h2 class="font-display text-xl md:text-2xl font-extrabold tracking-tight" style="color:var(--text-strong)">${r.t}</h2><a href="#" class="seehref">View all<i data-lucide="arrow-right" class="w-4 h-4"></i></a></div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">${r.items.map(card).join('')}</div></section>`).join('');

  // tabs
  document.querySelectorAll('#popTabs .chip').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('#popTabs .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fill('#popRail', pop[btn.dataset.tab]);
    lucide.createIcons();
  }));

  // wishlist toggle (delegated)
  document.addEventListener('click', e => {
    const w = e.target.closest('.wish');
    if (w) {
      w.classList.toggle('on');
      lucide.createIcons();
    }
  });

  // countdown
  const cd = $('#countdown');
  const end = Date.now() + (22 * 3600 + 13 * 60 + 40) * 1000;
  const unit = (v, l) => `<div class="count-box text-center rounded-[var(--radius-md)] px-2.5 py-1.5" style="background:rgba(255,255,255,.15)"><div class="text-white font-extrabold text-lg leading-none tnum">${String(v).padStart(2, '0')}</div><div class="text-[9px] uppercase tracking-wide mt-0.5" style="color:var(--iris-100)">${l}</div></div>`;
  function tick() {
    let d = Math.max(0, end - Date.now());
    const D = Math.floor(d / 864e5);
    d -= D * 864e5;
    const H = Math.floor(d / 36e5);
    d -= H * 36e5;
    const M = Math.floor(d / 6e4);
    d -= M * 6e4;
    const S = Math.floor(d / 1e3);
    cd.innerHTML = [unit(D, 'Days'), unit(H, 'Hrs'), unit(M, 'Min'), unit(S, 'Sec')].join('<span class="text-white font-bold px-0.5">:</span>');
  }
  tick();
  setInterval(tick, 1000);

  // mobile menu (toggle a simple slide list)
  $('#mobtoggle')?.addEventListener('click', () => {
    let m = $('#mobmenu');
    if (m) {
      m.remove();
      return;
    }
    m = document.createElement('div');
    m.id = 'mobmenu';
    m.className = 'md:hidden container-x pb-4';
    m.innerHTML = `<div class="flex flex-col gap-1 py-2">${['Home', 'Brands', 'Offers', 'All Vendors', 'Vendor Zone'].map(x => `<a href="#" class="navlink py-2 px-1">${x}</a>`).join('')}</div>`;
    document.querySelector('header').appendChild(m);
  });
  lucide.createIcons();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketplace/home.data.js", error: String((e && e.message) || e) }); }

__ds_ns.ProductCard = __ds_scope.ProductCard;

__ds_ns.SellerCard = __ds_scope.SellerCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.StarRating = __ds_scope.StarRating;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
