// ==UserScript==
// @name         HWHHandleConsumableUseLootBox
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Аўтаматычнае адчыненне лутбоксаў
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

  checkboxes["autoLootboxOpen"] = {
    title:
      "Аутаматычны запуск Аўтаадкрыцця лутбоксаў пры старце HeroWarsHelper",
    cbox: null,
    label: "Лутбоксы",
    default: false,
  };

  othersPopupButtons.push({
    msg: "Выправіць лутбоксы",
    title: "Праглядзець і выправіць аўтаматычнае адкрыццё лутбоксаў.",
    result: async () => {
      const items = getSaveVal(`${GM_info.script.name}`) || {};
      let sel = Object.keys(items).map((id) => {
        return {
          name: id,
          label: cheats.translate(`LIB_CONSUMABLE_NAME_${id}`),
          checked: items[id],
        };
      });

      let answer = await popup.confirm(
        "Лутбоксы",
        [
          { result: false, isClose: true },
          { msg: "Ok", result: true, isInput: false },
        ],
        sel,
      );
      if (answer) {
        const taskList = popup.getCheckBoxes();

        setSaveVal(
          `${GM_info.script.name}`,
          taskList.reduce((a, item) => {
            a[item.name] = item.checked;
            return a;
          }, {}),
        );
      }
    },
    color: "violet",
  });

  Events.on("checkChangeSend", async (request, call, callsIdent) => {
    if (call.name == "consumableUseLootBox") {
      const items = getSaveVal(`${GM_info.script.name}`) || {};

      if (Object.keys(items).includes(String(call.args.libId))) {
        console.log(
          "Автооткрытие",
          cheats.translate(`LIB_CONSUMABLE_NAME_${call.args.libId}`),
          items[String(call.args.libId)],
        );
      } else {
        const a = await popup.confirm("Адчыняем аўтаматычна?", [
          { msg: "Так", result: true, color: "green" },
          { msg: "Не", result: false, color: "red", isClose: true },
        ]);
        items[call.args.libId] = a;
        setSaveVal(`${GM_info.script.name}`, items);
      }
    }
  });

  Events.on("startGame", async () => {
    if (checkboxes["autoLootboxOpen"].cbox?.checked) {
      let open;
      while (((open = await tryAll()), open.length > 0)) {
        open.forEach(async (args) => {
          try {
            await Caller.send({ name: "consumableUseLootBox", args });
          } catch (e) {
            console.warn(e);
          }
        });
      }
    }
  });

  async function tryAll() {
    const inventory = await Caller.send("inventoryGet");
    const items = getSaveVal(`${GM_info.script.name}`) || {};

    return Object.keys(items)
      .filter((i) => items[i] && inventory.consumable[i])
      .map((i) => {
        const amount = inventory.consumable[i];
        const args = { libId: i, amount };
        const choice =
          lib.data.inventoryItem.consumable[i].effectDescription?.playerChoice;

        if (choice) {
          args.playerRewardChoiceIndex = 0;
        }

        return args;
      });
  }
})();

/*
 == Як працуе ==
   У Наладах дадаецца чэкбокс пры уключэнні якого, кожны раз калі стартуе галоуны скрыпт аўтаматычна адчыняюцца выбраныя лутбоксы.
   Калі Лутбокс адчыняецца упершыню задаецца пытаннь Дадаць лутбокс у аўтаадкрыцце ці не.
   Праглядзець ці змяніць аўтаматычнае адчыненне лутбоксаў можно па кнопцы `Выправіць лутбоксы` якая знаходзіцца у `Рознае`
 == Што новага ==
   
*/
