// ==UserScript==
// @name         HWHTitanArtifacts
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Паказвае колькасць артыфактау для титанау
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
  const { othersPopupButtons } = HWHData;

  othersPopupButtons.push({
    msg: "Артыфакты Тытанау",
    title: "Праглядзець неабходную колькасци артыфактау тытанау",
    result: async () => {
      const html = await res();
      await popup.confirm(html, [{ result: false, isClose: true }]);
    },
    color: "violet",
  });

  Events.on("startGame", async () => {
    document.styleSheets[document.styleSheets.length - 1].insertRule(
      ".result { text-align: initial; font-size: 16px; }",
      document.styleSheets[document.styleSheets.length - 1].cssRules.length,
    );
  });

  // --- базовые хелперы ---
  function getFnP(classF, nameF) {
    return Object.entries(classF.__properties__).find((e) => e[1] == nameF)[0];
  }
  function getProtoFn(classF, nF) {
    return Object.keys(classF.prototype)[nF];
  }
  function findFieldIndexByClass(instance, className) {
    const proto = Object.getPrototypeOf(instance);
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      try {
        if (instance[keys[i]]?.__class__?.j === className) {
          return { index: i, key: keys[i] };
        }
      } catch (e) {}
    }
    return null;
  }
  // get_id — вычисляемое Haxe-свойство, поэтому резолвится по имени через __properties__
  function getId(instance) {
    const idKey = getFnP(instance.__class__, "get_id");
    return instance[idKey]();
  }

  function getPlayer() {
    const GM_0 = getProtoFn(Game.GameModel, 0);
    const instance = getFnP(Game.GameModel, "get_instance");
    return Game.GameModel[instance]()[GM_0];
  }

  function getTitans() {
    const IM_0 = getProtoFn(selfGame["haxe.ds.IntMap"], 0);
    const player = getPlayer();
    const titanDataKey = findFieldIndexByClass(
      player,
      "game.model.user.hero.PlayerTitanData",
    )?.key;
    const playerTitanData = player[titanDataKey];
    const titanMapKey = findFieldIndexByClass(
      playerTitanData,
      "haxe.ds.IntMap",
    )?.key;
    return playerTitanData[titanMapKey][IM_0];
  }

  function getTitan(id) {
    return getTitans()[id];
  }

  function getCq() {
    const player = getPlayer();
    const cqKey = findFieldIndexByClass(
      player,
      "game.model.user.shop.PlayerShopData",
    )?.key;
    return player[cqKey];
  }

  // id 13 — магазин артефактов титанов, подтверждён через zq() === "LIB_SHOP_DESC_13".
  // Это серверная конфигурация магазинов, а не обфусцированное имя — если игра
  // когда-нибудь переназначит id, здесь понадобится обновить только эту константу.
  const TITAN_ARTIFACT_SHOP_ID = 13;

  // cq.J1(id) — прямой метод получения записи магазина по id (обычный метод,
  // без метаданных в __properties__, поэтому обращаемся по букве напрямую,
  // как и qqj/Llh/R6e/DWe выше)
  function getShop(id) {
    const cq = getCq();
    const entry = cq.J1(id);
    if (!entry) return undefined;
    const shopKey = findFieldIndexByClass(
      entry,
      "game.data.storage.shop.StaticSlotsShopDescription",
    )?.key;
    return shopKey ? entry[shopKey] : undefined;
  }

  function getArtifactDescription(artifactId) {
    const DataStorage = selfGame["game.data.storage.DataStorage"];
    const artifactStorageKey = Object.keys(DataStorage).find(
      (k) =>
        DataStorage[k]?.__class__?.j ===
        "game.data.storage.artifact.TitanArtifactStorage",
    );
    return DataStorage[artifactStorageKey].ob(String(artifactId));
  }

  // Открывает попап просмотра артефактов титана напрямую по id титана
  function goTitanArtifact(titanId) {
    const player = getPlayer();
    const titan = getTitan(titanId);
    if (titan == null) {
      console.error("Titan", titanId, "not found");
      return;
    }
    const TitanArtifactsPopupMediator =
      selfGame["game.mediator.gui.popup.artifacts.TitanArtifactsPopupMediator"];
    const event = new selfGame[
      "game.mediator.gui.popup.PopupStashEventParams"
    ]();
    new TitanArtifactsPopupMediator(player, null, titan.$A).open(event);
  }

  // Доводит сразу до диалога покупки конкретного артефакта у торговца.
  // qqj/Llh/R6e/DWe/kMc/$A/H — обычные методы и поля (не Haxe-свойства с
  // именем в __properties__), поэтому у них нет позиционно-независимого
  // способа резолвинга — обращаемся напрямую по буквам, актуальным для
  // текущей версии игры. Если после очередного обновления игры что-то из
  // этого перестанет работать — см. spyAllMethods() в истории переписки:
  // подслушать реальные вызовы вживую надёжнее, чем гадать по позиции.
  function goTitanArtifactMerchant(artifactId, titanId) {
    const cq = getCq();
    const artifactDesc = getArtifactDescription(artifactId);
    const titan = getTitan(titanId);
    if (!artifactDesc || !titan) {
      console.error("Artifact or titan not found", artifactId, titanId);
      return;
    }

    let targetSlot = cq.qqj(artifactDesc);
    if (targetSlot == null) targetSlot = cq.Llh(artifactDesc);
    if (targetSlot == null) {
      console.error("Slot for artifact", artifactId, "not found");
      return;
    }

    targetSlot.DWe(true);
    if (targetSlot.kMc == null) targetSlot.kMc = {};
    targetSlot.kMc.titanId = titan.$A.H();

    const shop = getShop(TITAN_ARTIFACT_SHOP_ID);
    if (!shop) {
      console.error("Titan artifact merchant shop not found");
      return;
    }

    const event = new selfGame[
      "game.mediator.gui.popup.PopupStashEventParams"
    ]();
    cq.R6e(shop, targetSlot, event);
  }

  // inline onClick в сгенерированном HTML выполняется в глобальном контексте
  // страницы, а не внутри этого замыкания — поэтому функции нужно явно
  // выставить на window, иначе будет "goTitanArtifact is not defined"
  window.goTitanArtifact = goTitanArtifact;
  window.goTitanArtifactMerchant = goTitanArtifactMerchant;

  async function res() {
    return Caller.send(["titanGetAll", "inventoryGet"])
      .then(([titanGetAll, inventoryGet]) => {
        const titanarts = Object.values(titanGetAll).map((titan) => {
          const arts = titan.artifacts.map((titan_art, i) => {
            const art_id = lib.data.titan[titan.id].artifacts[i];
            const type = lib.data.titanArtifact.id[art_id].type;
            const all_fragments = Object.values(
              lib.data.titanArtifact.type[type].evolution,
            )
              .filter((obj) => obj.star > titan_art.star)
              .reduce((acc, o) => acc + o.costFragmentsAmount, 0);

            return {
              titan: titan.id,
              id: art_id,
              need: all_fragments,
            };
          });
          return arts;
        });

        return {
          inventoryGet,
          _arts: Object.groupBy(
            titanarts.flat().filter((a) => a.need > 0),
            ({ id }) => id,
          ),
        };
      })
      .then(({ inventoryGet, _arts }) => {
        return Object.entries(_arts).reduce((acc, [id, arts]) => {
          acc[id] = {
            titans: arts.map((a) => a.titan),
            need:
              arts.reduce((ac, a) => ac + a.need, 0) -
              (inventoryGet.fragmentTitanArtifact[id] ?? 0),
          };
          return acc;
        }, {});
      })
      .then((_arts) => {
        const ht = [];
        ht.push("<ul class='result'>");
        Object.entries(_arts).forEach(([id, { titans, need }]) => {
          const art_name = cheats.translate(`LIB_TITAN_ARTIFACT_NAME_${id}`);
          const tts = titans
            .map(
              (t) =>
                `<a href="#" onClick="goTitanArtifact(${t})">${cheats.translate(`LIB_HERO_NAME_${t}`)}</a>` +
                ` (<a href="#" onClick="goTitanArtifactMerchant(${id},${t})">купить</a>)`,
            )
            .join(", ");
          ht.push(`<li>${art_name}: ${need} (${tts})</li>`);
        });
        ht.push("</ul>");
        return ht.join("");
      });
  }
})();
