// ==UserScript==
// @name         HWHHandleAdvPath
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Шлях Прыклы
// @author       yukkon
// @match		 https://www.hero-wars.com/*
// @match	     https://apps-1701433570146040.apps.fbsbx.com/*
// @icon         https://lh3.googleusercontent.com/a/ACg8ocI7HD7_lM6wzmL1Giq8A0gXjtlsiyMDXJx5sX8CmT5LX4NiJw2t=s315-c-no
// @grant        none
// @downloadURL  https://yukkon.github.io/HWExts/HWHHandleConsumableUseLootBox.js
// @updateURL    https://yukkon.github.io/HWExts/HWHHandleConsumableUseLootBox.js
// @homepage	 https://github.com/yukkon/HWExts
// ==/UserScript==

(function () {
  if (!this.HWHClasses) {
    console.log("%cObject for extension not found", "color: red");
    return;
  }

  console.log(
    `%cStart ${GM_info.script.name} Extension by ${GM_info.script.author} (v.${GM_info.script.version})`,
    "color: red",
  );

  const { addExtentionName } = HWHFuncs;
  addExtentionName(
    GM_info.script.name,
    GM_info.script.version,
    GM_info.script.author,
  );

  const { Events, setSaveVal, getSaveVal, popup, setProgress } = HWHFuncs;
  const { checkboxes, othersPopupButtons } = HWHData;

  checkboxes["advPath"] = {
    title:
      "Паказаць шлях",
    cbox: null,
    label: "Шлях",
    default: false,
  };

  Events.on("checkChangeSend", async (request, call, callsIdent) => {
    if (call.name === "adventureSolo_turnStartBattle" || call.name === "adventure_turnStartBattle") {
      const items = getSaveVal(`${GM_info.script.name}`) || {};
      console.log(call.args.path)
    }
  });

  Events.on("startGame", async () => {
    if (checkboxes["advPath"].cbox?.checked) {

    }
  });
})();

/*
 == Як працуе ==
   У Наладах дадаецца чэкбокс пры уключэнні якого, кожны раз калі стартуе галоуны скрыпт аўтаматычна адчыняюцца выбраныя лутбоксы.
   Калі Лутбокс адчыняецца упершыню задаецца пытаннь Дадаць лутбокс у аўтаадкрыцце ці не.
   Праглядзець ці змяніць аўтаматычнае адчыненне лутбоксаў можно па кнопцы `Выправіць лутбоксы` якая знаходзіцца у `Рознае`
 == Што новага ==

*/
