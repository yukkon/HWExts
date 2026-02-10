// ==UserScript==
// @name         HWHAutoBeta
// @namespace    http://tampermonkey.net/
// @version      0.0.28b
// @description  try to take over the world!
// @author       yukkon
// @match			   https://www.hero-wars.com/*
// @match		  	 https://apps-1701433570146040.apps.fbsbx.com/*
// @icon  	     https://lh3.googleusercontent.com/a/ACg8ocI7HD7_lM6wzmL1Giq8A0gXjtlsiyMDXJx5sX8CmT5LX4NiJw2t=s315-c-no
// @grant        none
// @downloadURL  https://yukkon.github.io/HWExts/Userscript.user.js
// @updateURL    https://yukkon.github.io/HWExts/Userscript.user.js
// @homepage		 https://github.com/yukkon/HWExts
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

  const { buttons, checkboxes } = HWHData;

  buttons["autokach"] = {
    isCombine: true,
    combineList: [
      {
        name: "АўтафармТест",
        title: "Аутаматычны фарм ресурсаў партрэбных героям",
        onClick: () => {
          if (game.vip >= 1 || game.raidticket) {
            run();
          } else {
            setProgress(
              "Вы не валодаеце залатым квітком і ваш VIP не дазваляе праводзіць рэйды",
            );
          }
        },
      },
      {
        name: '<span style="color: White; font-size: 24px;">⛭</span>',
        onClick: async () => {
          settings();
        },
        title: "Налады",
        color: "green",
      },
    ],
  };

  const game = {};

  Events.on("startGame", async (r) => {
    console.log("АўтаСтарт АўтафармаТест");

    const [heroes, userInfo, userInventory, missions] = await Caller.send([
      "heroGetAll",
      "userGetInfo",
      "inventoryGet",
      "missionGetAll",
    ]);
    check_raid({ userInfo, userInventory });
    setHeroes(heroes);

    game.missions = new HWHHandleMissions(missions);
    game.inventory = new HWHHandleInventory(userInventory);
    game.selected = getSaveVal(GM_info.script.name);

    // get all nedded missions for all avaliable heroes

    lo = {};
    for (const id in game.heroes) {
      const hero = game.heroes[id];
      Object.values(hero.slots)
        .flat()
        .forEach((item) => {
          lo[item] = 1 + ~~lo[item];
        });
    }

    game.inventory.f0({ gear: lo });
    const mions = game.missions.searchMissions(game.inventory.needed);
    const ms = mions.reduce((acc, item) => {
      acc[item] = 1 + ~~acc[item];
      return acc;
    }, {});
  });

  async function run() {
    if (game.selected) {
      hh();
    } else {
      await settings();
      hh();
    }
  }

  function check_raid({ userInfo, userInventory }) {
    const vipLevel = Math.max(
      ...lib.data.level.vip
        .filter((l) => l.vipPoints <= +userInfo.vipPoints)
        .map((l) => l.level),
    );

    game.vip = vipLevel;
    game.raid_ticket = !!userInventory.consumable[151];
    game.stamina = userInfo.refillable.find((x) => x.id == 1).amount;
  }

  async function hh() {
    console.info(`Качаем:`, logHeroes(game.selected));

    const lo = {};
    for (const id in game.selected) {
      const hero = game.heroes[id];
      for (const color of game.selected[id]) {
        hero.slots[color].reduce((acc, item) => {
          acc[item] = 1 + ~~acc[item];
          return acc;
        }, lo);
      }
    }
    console.log(logResources({ gear: lo }));

    game.inventory.reload();
    game.inventory.f0({ gear: lo });
    console.log(logResources(game.inventory.needed));

    const missions = game.missions.searchMissions(game.inventory.needed);

    const ms = missions.reduce((acc, id) => {
      acc[id] = 1 + ~~acc[id];
      return acc;
    }, {});

    Object.keys(ms);
    console.log(ms);

    const times = game.vip >= 5 ? 10 : 1;
    /*
    // mission case
    let mission = selectMission();

    while (mission && stamina >= times * mission.cost) {
      // region run mission
      let response = await runMission(mission);
      // endregion
      const res = Helper.merge(Object.values(response)); // працессаем вынікі міссіі
      //const res1 = Hekper.intersect(res, this.needed); //пакахваем што атрымалі

      //this.result = Helper.intersect(this.result, res1); //захоўваем вынікі
      //this.needed = Helper.subtraction(this.needed, res); // захоўваем што засталося
      //калі у нідыд нешта есць шукаем наступную міссію

      stamina -= mission.cost * times;

      setProgress(
        `Атрымалі: ${o.count} / ${res.count} '${
          o.name
        }' <br> выкарыставана энки ${o.used} (${(o.used / o.count).toFixed(
          2,
        )})`,
      );
      mission = selectMission();
    }
      */
  }

  const Helper = {
    // аб'яднанне вынікаў выкліка міссій
    merge(response) {
      return response.reduce((acc2, object) => {
        Object.keys(object).forEach((key) => {
          Object.entries(object[key]).forEach(([id, count]) => {
            acc2[key] = acc2[key] || {};
            acc2[key][id] = acc2[key][id] || 0;
            acc2[key][id] += count;
          });
        });
        return acc2;
      }, {});
    },
    //возвращает элеиенты 1 объекта которые есть во втором
    intersect(source, destination) {
      return Object.keys(source).reduce((acc, key) => {
        if (destination[key]) {
          acc[key] = {};
          Object.keys(source[key]).forEach((id) => {
            if (destination[key][id]) {
              acc[key][id] = source[key][id];
            }
          });
        }
        return acc;
      }, {});
    },
    subtraction(source, destination) {
      return Object.keys(source).reduce((acc, key) => {
        if (destination[key]) {
          acc[key] = {};
          Object.keys(source[key]).forEach((id) => {
            if (destination[key][id]) {
              acc[key][id] = source[key][id] - destination[key][id];
            }
          });
        }
        return acc;
      }, {});
    },
  };
  /////////////////////////////////////////////////////////////////////////////////
  async function settings() {
    const storredHeroes = getSaveVal(GM_info.script.name, {});

    const heroes = Object.values(game.heroes);
    let heroesForSelect = heroes.map((hero) => {
      return {
        name: hero.id,
        label: cheats.translate(`LIB_HERO_NAME_${hero.id}`),
        checked: storredHeroes[hero.id],
      };
    });

    let answer = await popup.confirm(
      "Выбери героев",
      [
        { result: false, isClose: true },
        { msg: "Ok", result: true, isInput: false },
      ],
      heroesForSelect,
    );
    if (answer) {
      const taskList = popup.getCheckBoxes();
      let selectedHeroes = taskList
        .filter((checkBox) => checkBox.checked)
        .map((checkBox) => Number(checkBox.name));

      if (selectedHeroes.length > 0) {
        const rangsToSelect = Object.values(selectedHeroes).map((heroId) => {
          let hero = game.heroes[heroId];

          return Object.keys(hero.slots).map((colotId) => ({
            color: cheats.translate(
              lib.data.enum.heroColor[colotId].locale_key,
            ),
            name: `${hero.id}|${colotId}`,
            checked: storredHeroes[hero.id]?.includes(Number(colotId)),
            label: `${hero.name} - ${cheats.translate(lib.data.enum.heroColor[colotId].locale_key)} ${lib.data.enum.heroColor[colotId].ident.match(/\+/g)?.length || ""}`,
          }));
        });

        answer = await popup.confirm(
          "Выбери ранги",
          [
            { result: false, isClose: true },
            { msg: "Ok", result: true, isInput: false },
          ],
          rangsToSelect.flat(),
        );
        if (answer) {
          const taskList = popup.getCheckBoxes();
          const selectedRangs = taskList
            .filter((checkBox) => checkBox.checked)
            .reduce((acc, checkBox) => {
              let [hero, color] = checkBox.name.split("|");
              if (!acc[hero]) {
                acc[hero] = [];
              }
              if (!acc[hero].includes(color)) {
                acc[hero].push(Number(color));
              }

              return acc;
            }, {});
          if (Object.keys(selectedRangs).length > 0) {
            setSaveVal(GM_info.script.name, selectedRangs);
            game.selected = selectedRangs;
          }
        }
      }
    }
  }

  class HWHHandleInventory {
    constructor(inventory) {
      this.inventory = inventory;
      this.needed = {};
    }

    async reload() {
      const userInventory = await Caller.send("inventoryGet");
      this.needed = {};
      game.inventory = userInventory;
      this.inventory = userInventory;
    }

    f0(obj, count = 1) {
      if (count == 0) {
        return;
      }
      // Iterate over each item type (e.g., 'gear', 'scroll')
      for (const itemType in obj) {
        if (itemType === "gold") continue; // Skip gold

        // Iterate over each specific item ID within the item type
        for (const itemId in obj[itemType]) {
          const requiredAmount = obj[itemType][itemId] * count;
          if (requiredAmount === 0) continue;

          const availableInInventory = this.inventory[itemType]?.[itemId] || 0;

          if (availableInInventory >= requiredAmount) {
            this.inventory[itemType][itemId] -= requiredAmount; // Consume from inventory
            continue; // Move to the next item
          }

          const deficit = requiredAmount - availableInInventory;
          const itemData = lib.data.inventoryItem[itemType]?.[itemId];

          // Try crafting the item
          if (itemData.craftRecipe) {
            const neededSubComponents = itemData.craftRecipe;
            this.f0(neededSubComponents, deficit); // Recursively check sub-components
            continue; // Current item fulfilled, move to next
          }

          // Try fragment merging if no craft recipe
          if (itemData.fragmentMergeCost) {
            const fragmentType = `fragment${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;
            const fragmentId = itemId; // Assuming fragment ID is the same as item ID
            const fragmentsNeededTotal =
              deficit * itemData.fragmentMergeCost.fragmentCount;
            const availableFragments =
              this.inventory[fragmentType]?.[fragmentId] || 0;

            if (availableFragments >= fragmentsNeededTotal) {
              this.inventory[fragmentType][fragmentId] -= fragmentsNeededTotal; // Consume fragments
              this.inventory[itemType][itemId] =
                (this.inventory[itemType][itemId] || 0) + deficit; // ? "Merge" the item
              this.inventory[itemType][itemId] -= deficit; // ? Consume it immediately for the current need
              continue; // Current item fulfilled, move to next
            } else {
              const fragmentDeficit = fragmentsNeededTotal - availableFragments;
              this.needed[fragmentType] = this.needed[fragmentType] || {};
              if (!this.needed[fragmentType][itemId]) {
                this.needed[fragmentType][itemId] = fragmentDeficit;
              } else {
                this.needed[fragmentType][itemId] += fragmentDeficit;
              }
            }
            continue;
          }

          // need item
          this.needed[itemType] = this.needed[itemType] || {};
          this.needed[itemType][itemId] = deficit;
          this.inventory[itemType][itemId] =
            (this.inventory[itemType][itemId] || 0) - deficit;
        }
      }
    }
  }

  class HWHHandleMissions {
    constructor(missions) {
      this.missions = missions;

      this.availableMissionsToRaid = Object.values(this.missions)
        .filter((mission) => mission.stars === 3)
        .map((mission) => mission.id);

      this.Reward2Mission = Object.values(lib.data.mission).reduce(
        (acc, mission) => {
          if (!this.availableMissionsToRaid.includes(mission.id)) {
            return acc;
          }

          const enemies = mission.normalMode.waves
            .map((wave) => wave.enemies)
            .flat();
          const drop = enemies
            .filter((enemy) => !!enemy.drop?.length)
            .map((enemy) => enemy.drop)
            .flat();
          const reward = drop.filter((d) => d.chance > 0).map((d) => d.reward);

          reward.forEach((r) => {
            Object.keys(r).forEach((inventoryKey) => {
              if (!acc[inventoryKey]) {
                acc[inventoryKey] = {};
                Object.keys(r[inventoryKey]).forEach((inventoryItem) => {
                  acc[inventoryKey][inventoryItem] = [mission.id];
                });
              } else {
                Object.keys(r[inventoryKey]).forEach((inventoryItem) => {
                  if (!acc[inventoryKey][inventoryItem]) {
                    acc[inventoryKey][inventoryItem] = [mission.id];
                  } else {
                    acc[inventoryKey][inventoryItem].push(mission.id);
                  }
                });
              }
            });
          });

          return acc;
        },
        {},
      );
    }

    missions(res) {
      return this.searchMissions(res)
        .map((id) => lib.data.mission[id])
        .filter((m) => !m.isHeroic)
        .map((x) => ({
          id: x.id,
          cost: x.normalMode.teamExp,
        }));
    }

    // {fragmentGear: {160: 13}, fragmentScroll: {160: 20}}
    searchMissions(items) {
      let out = [];
      for (const itemType in items) {
        for (const itemId in items[itemType]) {
          if (this.Reward2Mission[itemType]) {
            out.push(...(this.Reward2Mission[itemType][itemId] || []));
          }
        }
      }
      return out;
    }
  }

  function logResources(items) {
    let out = [];
    for (const itemType in items) {
      for (const itemId in items[itemType]) {
        const o = {
          name:
            (itemType.indexOf("fragment") >= 0 ? "фрагмент " : "") +
            cheats.translate(
              `LIB_${itemType.replace("fragment", "").toUpperCase()}_NAME_${itemId}`,
            ) +
            `(${itemId})`,
          count: items[itemType][itemId],
        };

        out.push(o);
      }
    }
    return out;
  }

  // {2:[16,17]}
  function logHeroes(heroes) {
    return Object.keys(heroes).map((id) => ({
      id,
      name: cheats.translate(`LIB_HERO_NAME_${id}`),
      colors: heroes[id].map((c) => ({
        name: cheats.translate(lib.data.enum.heroColor[c].locale_key),
        count: lib.data.enum.heroColor[c].ident.match(/\+/g)?.length,
      })),
    }));
  }

  function setHeroes(Heroes) {
    const out = {};

    for (const hero in Heroes) {
      const actualColors = Object.keys(lib.data.hero[hero].color).filter(
        (c) => c >= Heroes[hero].color,
      );

      const colorSlots = actualColors.reduce((acc, color) => {
        const slots = lib.data.hero[hero].color[color].items
          .map((val, ind) => {
            if (color == Heroes[hero].color) {
              return Heroes[hero].slots[ind] ?? val;
            } else {
              return val;
            }
          })
          .filter(Number);

        acc[color] = slots;

        return acc;
      }, {});

      const notFull =
        Heroes[hero].color < 18 &&
        colorSlots[18].reduce((a, s) => a + s, 0) > 0;
      if (notFull) {
        out[hero] = {
          id: Heroes[hero].id,
          name: cheats.translate(`LIB_HERO_NAME_${hero}`),
          color: Heroes[hero].color,
          power: Heroes[hero].power,
          slots: colorSlots,
        };
      }
    }
    game.heroes = out;
  }
})();
/*
 == Што новага ==
 1.0.25 - дабаўлены чэкбокс у налады які дазваляе запускаць аўтафарм пры старці галоўнага скрыпта
 1.0.26 - выпраулены рэйд 10
 1.0.27 - выпраўлена памылка з фрагментамі
*/
