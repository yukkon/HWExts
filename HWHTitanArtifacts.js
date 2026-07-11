// ==UserScript==
// @name         HWHTitanArtifacts
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  Паказвае колькасць артыфактау для титанау
// @author       yukkon
// @match		 https://www.hero-wars.com/*
// @match	     https://apps-1701433570146040.apps.fbsbx.com/*
// @icon         https://lh3.googleusercontent.com/a/ACg8ocI7HD7_lM6wzmL1Giq8A0gXjtlsiyMDXJx5sX8CmT5LX4NiJw2t=s315-c-no
// @grant        none
// @downloadURL  https://yukkon.github.io/HWExts/HWHTitanArtifacts.js
// @updateURL    https://yukkon.github.io/HWExts/HWHTitanArtifacts.js
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

  // Закрывает попап результатов ("Артыфакты Тытанау") точно так же, как это
  // делает сам hwh.js по нажатию Escape — корректно разрешает промис
  // popup.confirm(...), а не просто прячет DOM-элемент
  function closeResultsPopup() {
    if (popup.dialogPromice) {
      const { func, result } = popup.dialogPromice;
      popup.dialogPromice = null;
      popup.hide();
      func(result);
    } else {
      popup.hide();
    }
  }

  // Открывает попап просмотра артефактов титана напрямую по id титана
  function goTitanArtifact(titanId) {
    const player = getPlayer();
    const titan = getTitan(titanId);
    if (titan == null) {
      console.error("Titan", titanId, "not found");
      return;
    }
    closeResultsPopup();
    const TitanArtifactsPopupMediator =
      selfGame["game.mediator.gui.popup.artifacts.TitanArtifactsPopupMediator"];
    const event = new selfGame[
      "game.mediator.gui.popup.PopupStashEventParams"
    ]();
    new TitanArtifactsPopupMediator(player, null, titan.$A).open(event);
  }

  // Доводит сразу до диалога покупки конкретного артефакта у торговца.
  // pqj/Mlh/S6e/EWe/kMc/$A/H — обычные методы и поля (не Haxe-свойства с
  // именем в __properties__), поэтому у них нет позиционно-независимого
  // способа резолвинга — обращаемся напрямую по буквам, актуальным для
  // текущей версии игры (сверено с оригиналом wll() в heroes.js: было
  // qqj/Llh/R6e/DWe, стало pqj/Mlh/S6e/EWe после очередного обновления).
  // Если после следующего обновления игры что-то из этого перестанет
  // работать — см. spyAllMethods() в истории переписки: подслушать реальные
  // вызовы вживую надёжнее, чем гадать по позиции.
  function goTitanArtifactMerchant(artifactId, titanId) {
    const cq = getCq();
    const artifactDesc = getArtifactDescription(artifactId);
    const titan = getTitan(titanId);
    if (!artifactDesc || !titan) {
      console.error("Artifact or titan not found", artifactId, titanId);
      return;
    }

    let targetSlot = cq.pqj(artifactDesc);
    if (targetSlot == null) targetSlot = cq.Mlh(artifactDesc);
    if (targetSlot == null) {
      console.error("Slot for artifact", artifactId, "not found");
      return;
    }

    targetSlot.EWe(true);
    if (targetSlot.kMc == null) targetSlot.kMc = {};
    targetSlot.kMc.titanId = titan.$A.H();

    const shop = getShop(TITAN_ARTIFACT_SHOP_ID);
    if (!shop) {
      console.error("Titan artifact merchant shop not found");
      return;
    }

    closeResultsPopup();
    const event = new selfGame[
      "game.mediator.gui.popup.PopupStashEventParams"
    ]();
    cq.S6e(shop, targetSlot, event);
  }

  // inline onClick в сгенерированном HTML выполняется в глобальном контексте
  // страницы, а не внутри этого замыкания — поэтому функции нужно явно
  // выставить на window, иначе будет "goTitanArtifact is not defined"
  window.goTitanArtifact = goTitanArtifact;
  window.goTitanArtifactMerchant = goTitanArtifactMerchant;

  // --- прокачка узроуняу артыфактау (стихийная эсэнцыя / іншыя consumable) ---

  // Максимальный доступный уровень в levels — учитываем, что это может быть
  // как плотный массив, так и объект-словарь (Haxe IntMap), у которого нет
  // .length, из-за чего Math.min(target, levels.length - 1) давал NaN и цикл
  // прокачки вообще не выполнялся (отсюда ложное "всё уже максимум")
  function getMaxLevelKey(levels) {
    if (Array.isArray(levels)) return levels.length - 1;
    const keys = Object.keys(levels)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    return keys.length ? Math.max(...keys) : 0;
  }

  // Лічыць сумарную кошт прокачкі усіх артэфактау титанау з бягучага узроуню
  // да максімальнага, даступнага у lib.data.titanArtifact.type[type].levels.
  // Вяртае { category: { resId: amount } }.
  function getArtifactLevelUpCost(titanGetAll) {
    const totalCost = {};

    Object.values(titanGetAll).forEach((titan) => {
      titan.artifacts.forEach((titan_art, i) => {
        const art_id = lib.data.titan[titan.id].artifacts[i];
        const type = lib.data.titanArtifact.id[art_id].type;
        const levels = lib.data.titanArtifact.type[type].levels;

        const curLevel = titan_art.level ?? 0;
        const target = getMaxLevelKey(levels);
        if (curLevel >= target) return;

        for (let lvl = curLevel + 1; lvl <= target; lvl++) {
          const cost = levels[lvl]?.cost;
          if (!cost) continue;
          for (const category in cost) {
            totalCost[category] = totalCost[category] || {};
            if (category === "gold") {
              totalCost[category] = (totalCost[category] || 0) + cost[category];
            } else {
              for (const resId in cost[category]) {
                totalCost[category][resId] =
                  (totalCost[category][resId] || 0) + cost[category][resId];
              }
            }
          }
        }
      });
    });

    return totalCost;
  }

  // Зводзіць need/have/shortfall для аднаго "рэсурснага" блока
  // (fragmentTitanArtifact для звёзд, consumable для узроуняу і г.д.)
  function buildNeedHaveTable(needByResId, inventoryBucket) {
    return Object.entries(needByResId)
      .map(([resId, need]) => {
        const have = inventoryBucket?.[resId] ?? 0;
        const shortfall = Math.max(0, need - have);
        return { resId, need, have, shortfall };
      })
      .sort((a, b) => b.shortfall - a.shortfall || b.need - a.need);
  }

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

        const starsResult = Object.entries(
          Object.groupBy(
            titanarts.flat().filter((a) => a.need > 0),
            ({ id }) => id,
          ),
        ).reduce((acc, [id, arts]) => {
          acc[id] = {
            titans: arts.map((a) => a.titan),
            need:
              arts.reduce((ac, a) => ac + a.need, 0) -
              (inventoryGet.fragmentTitanArtifact[id] ?? 0),
          };
          return acc;
        }, {});

        // --- блок 2: прокачка узроуняу (consumable) ---
        const levelUpCost = getArtifactLevelUpCost(titanGetAll);
        const levelUpTables = Object.entries(levelUpCost).reduce(
          (acc, [category, needByResId]) => {
            acc[category] = buildNeedHaveTable(
              needByResId,
              inventoryGet[category],
            );
            return acc;
          },
          {},
        );

        return { starsResult, levelUpTables };
      })
      .then(({ starsResult, levelUpTables }) => {
        const ht = [];

        // --- вывад: эвалюцыя (звёзды) — без изменений ---
        ht.push("<ul class='result'>");
        Object.entries(starsResult)
          .sort(([, a], [, b]) => a.need - b.need)
          .forEach(([id, { titans, need }]) => {
            const art_name = cheats.translate(`LIB_TITAN_ARTIFACT_NAME_${id}`);
            const tts = titans
              .map(
                (t) =>
                  `<a href="#" onClick="goTitanArtifact(${t})">${cheats.translate(`LIB_HERO_NAME_${t}`)}</a>`,
              )
              .join(", ");
            const buyLink = `<a href="#" onClick="goTitanArtifactMerchant(${id},${titans[0]})">${art_name}</a>`;
            ht.push(`<li>${buyLink}: ${need} (${tts})</li>`);
          });
        ht.push("</ul>");

        // --- вывад: прокачка узроуняу ---
        ht.push("<hr><b>Прокачка да максімальнага узроуню:</b>");
        const categories = Object.keys(levelUpTables);
        if (categories.length === 0) {
          ht.push(
            "<ul class='result'><li>Усе артыфакты ужо максімальнага узроуню.</li></ul>",
          );
        }
        categories.forEach((category) => {
          ht.push(`<div><i>${category}</i></div><ul class='result'>`);
          levelUpTables[category].forEach(
            ({ resId, need, have, shortfall }) => {
              const shortStr = shortfall
                ? ` <span style="color:red">(не хапае ${shortfall})</span>`
                : ` <span style="color:green">(хапае)</span>`;
              ht.push(
                `<li>#${resId}: трэба ${need} / ёсць ${have}${shortStr}</li>`,
              );
            },
          );
          ht.push("</ul>");
        });

        return ht.join("");
      });
  }
})();
