// ==UserScript==
// @name			      HWHYukkonExt
// @name:en			    HWHYukkonExt
// @name:ru			    HWHYukkonExt
// @namespace		    HWHYukkonExt
// @version			    1.0.19
// @author          yukkon
// @description		  Extension for HeroWarsHelper script
// @description:en	Extension for HeroWarsHelper script
// @description:ru	Расширение для скрипта HeroWarsHelper
// @resource json   https://support.oneskyapp.com/hc/en-us/article_attachments/202761727
// @downloadURL     hhttps://yukkon.github.io/HWExts/HWHYukkonExt.js
// @updateURL       https://yukkon.github.io/HWExts/HWHYukkonExt.js
// @icon  		    	https://lh3.googleusercontent.com/a/ACg8ocI7HD7_lM6wzmL1Giq8A0gXjtlsiyMDXJx5sX8CmT5LX4NiJw2t=s315-c-no
// @match	      		https://www.hero-wars.com/*
// @match		      	https://apps-1701433570146040.apps.fbsbx.com/*
// @run-at		      document-start
// ==/UserScript==

(function () {
  if (!this.HWHClasses) {
    console.log("%cObject for extension not found", "color: red");
    return;
  }

  console.log(
    `%cStart ${GM_info.script.name} (v.${GM_info.script.version} by ${GM_info.script.author}`,
    "color: red"
  );
  const { addExtentionName } = HWHFuncs;
  addExtentionName(
    GM_info.script.name,
    GM_info.script.version,
    GM_info.script.author
  );

  const { othersPopupButtons } = HWHData;
  const { popup, Events } = HWHFuncs;

  othersPopupButtons.push({
    msg: "Нейкае непатрэбства",
    title: "Нейкія рэсурсы якія калі некалі цікавяць мяне",
    result: onClickNewButton,
    color: "green",
  });

  Events.on("startGame", (r) => {
    console.log("startGame!");
    console.info("load from main", document.readyState);
    loadModules();
    applyCSSRules();
    addCSSFile("https://yukkon.github.io/HWExts/tabber.css");
    document.body.addEventListener("click", (e) => {
      var r = e.target.closest(
        ".wds-tabber:not(.wds-tabber-react-common) .wds-tabs__tab"
      );
      r && (e.preventDefault(), d(r));
    });
    // переключение табов
    function d(e) {
      if (e.parentNode) {
        var r = Array.from(e.parentNode.children).indexOf(e),
          t = e.closest(".wds-tabber");
        t &&
          (t.querySelectorAll(":scope > .wds-tab__content").forEach((e, t) => {
            e.classList.toggle("active", r === t);
          }),
          t
            .querySelectorAll(":scope > .wds-tabs__wrapper .wds-tabs__tab")
            .forEach((e, t) => {
              e.classList.toggle("active", r === t);
            }));
      }
    }
  });

  async function loadModules() {
    const { getEvents } = await import(
      "https://cdn.jsdelivr.net/gh/yukkon/HWExts/exports/GetEvents.js"
    );
    const { getTop } = await import(
      "https://cdn.jsdelivr.net/gh/yukkon/HWExts/exports/GetTop.js"
    );
    const { get, set, update, createStore } = await import(
      "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm"
    );
    const { getSkins } = await import(
      "https://cdn.jsdelivr.net/gh/yukkon/HWExts/exports/HeroSkins.js"
    );
    const { getHeroes } = await import(
      "https://cdn.jsdelivr.net/gh/yukkon/HWExts/exports/GetHeroes.js"
    );
    const { createTab } = await import(
      "https://yukkon.github.io/HWExts/exports/createTab.js"
    );

    window[GM_info.script.name] = {
      modules: {
        getEvents,
        getTop,
        idb: { get, set, update, createStore },
        getSkins,
        getHeroes,
        createTab,
      },
    };
  }

  async function onClickNewButton() {
    const popupButtons = [
      {
        msg: "Падзеі",
        result: async () => {
          let arr = await window[GM_info.script.name].modules.getEvents();

          let res = document.createElement("div");
          res.id = "__result";

          arr.forEach((x) => {
            let ev = document.createElement("details");
            res.append(ev);

            let n = document.createElement("summary");
            n.textContent = `${x.name} (${x.startDate} - ${x.endDate})`;
            ev.append(n);

            let s = document.createElement("p");
            ev.append(s);

            x.steps.forEach((y) => {
              let nn = document.createElement("div");
              let name = (y.name || "")
                .replaceAll(/ "?%param\d%"?/g, "")
                .replaceAll(/\$m\((.*?)\|(.*?)\|(.*?)\)/g, "$1");
              nn.textContent = `${name}: ${y.b.map((q) => q.amount)}`;
              //const s_args = xBb.stateFuncNew(y.b);
              s.append(nn);
            });
          });
          popup.confirm(res.outerHTML, [{ result: false, isClose: true }]);
        },
        title: "Падзеі",
      },
      {
        msg: "Топ героеў",
        result: async () => {
          let arr = await window[GM_info.script.name].modules.getTop();

          let res = document.createElement("div");
          res.id = "__result";

          Object.entries(arr)
            .filter(([id, _]) => id < 100)
            .sort(([a_id, a_count], [b_id, b_count]) => b_count - a_count)
            .forEach(([id, count]) => {
              let r = document.createElement("div");
              r.className = "row";
              r.textContent = `${cheats.translate(
                `LIB_HERO_NAME_${id}`
              )} - ${count}`;

              res.appendChild(r);
            });

          popup.confirm(res.outerHTML, [{ result: false, isClose: true }]);
        },
        title: "Топ героеў",
      },
      {
        msg: "Скіны",
        result: async () => {
          const skind = await window[GM_info.script.name].modules.getSkins();
          console.log(skind);

          let res = document.createElement("div");
          res.id = "__result";

          // Создаем табы
          let tblr = document.createElement("div");
          tblr.className = "tabber wds-tabber";

          let tsw = document.createElement("div");
          tsw.className = "wds-tabs__wrapper";
          tblr.appendChild(tsw);

          let ts = document.createElement("ul");
          ts.className = "wds-tabs";
          tsw.appendChild(ts);

          const f = (coin, sks) => {
            const m = window[GM_info.script.name].modules.createTab(
              coin == "undefined"
                ? "Фулл"
                : cheats.translate(`LIB_COIN_NAME_${coin}`)
            );

            let d = document.createElement("div");
            d.className = "table";

            sks
              .sort((a, b) => {
                if (a.cost?.coin && b.cost?.coin) {
                  return a.cost?.coin[coin] - b.cost?.coin[coin];
                } else {
                  return 0;
                }
              })
              .forEach((x) => {
                let r = document.createElement("div");
                r.className = "row";

                let c = document.createElement("div");
                c.className = "cell col-3";
                c.innerText = cheats.translate(`LIB_HERO_NAME_${x.id}`);
                r.appendChild(c);

                c = document.createElement("div");
                c.className = `cell col-5`;
                c.innerText = x.cost.coin ? x.cost.coin[coin] : "";
                r.appendChild(c);

                d.appendChild(r);
                m.tab_content.appendChild(d);
              });

            return m;
          };
          const skins = Object.groupBy(skind, (x) => {
            if (x.cost.coin) {
              return Object.keys(x.cost?.coin);
            }
          });

          Object.keys(skins).forEach((k) => {
            const m = f(k, skins[k]);
            ts.appendChild(m.tab);
            tblr.appendChild(m.tab_content);
          });
          res.appendChild(tblr);

          popup.confirm(res.outerHTML, [{ result: false, isClose: true }]);
        },
        title: "Скіны",
      },
    ];
    popupButtons.push({ result: false, isClose: true });
    const answer = await popup.confirm("Выбери действие", popupButtons);
    if (typeof answer === "function") {
      answer();
    }
  }

  function applyCSSRules() {
    document.styleSheets[document.styleSheets.length - 1].insertRule(
      "#__result { text-align: initial; font-size: 16px; }",
      document.styleSheets[document.styleSheets.length - 1].cssRules.length
    );

    document.styleSheets[document.styleSheets.length - 1].insertRule(
      "details > p, details > div { padding-left: 2em; }",
      document.styleSheets[document.styleSheets.length - 1].cssRules.length
    );

    document.styleSheets[document.styleSheets.length - 1].insertRule(
      ".answers { padding-left: 2em; }",
      document.styleSheets[document.styleSheets.length - 1].cssRules.length
    );

    document.styleSheets[document.styleSheets.length - 1].insertRule(
      "input[type='checkbox'] ~ div.answers {display: none; }",
      document.styleSheets[document.styleSheets.length - 1].cssRules.length
    );

    document.styleSheets[document.styleSheets.length - 1].insertRule(
      "input[type='checkbox']:checked ~ div.answers { display: block; }",
      document.styleSheets[document.styleSheets.length - 1].cssRules.length
    );
    document.styleSheets[document.styleSheets.length - 1].insertRule(
      ".summary .PopUp_checkbox:checked ~.answers div.rank:first-child .PopUp_checkbox { checked: true; }",
      document.styleSheets[document.styleSheets.length - 1].cssRules.length
    );
  }

  function addCSSFile(url) {
    document.head.insertAdjacentHTML(
      "beforeend",
      `<link rel="stylesheet" href="${url}" type="text/css" />`
    );
  }
})();
