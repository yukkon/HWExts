// ==UserScript==
// @name         HWHAuto
// @namespace    http://tampermonkey.net/
// @version      1.0.17
// @description  try to take over the world!
// @author       yukkon
// @match        https://www.hero-wars.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hero-wars.com
// @grant        none
// @downloadURL  https://yukkon.github.io/HWExts/Userscript.user.js
// @updateURL    https://yukkon.github.io/HWExts/Userscript.user.js
// ==/UserScript==

(function () {
  if (!this.HWHClasses) {
    console.log("%cObject for extension not found", "color: red");
    return;
  }

  console.log(
    `%cStart ${GM_info.script.name} Extension by ${GM_info.script.author} (v.${GM_info.script.version})`,
    "color: red"
  );

  const { addExtentionName } = HWHFuncs;
  addExtentionName(
    GM_info.script.name,
    GM_info.script.version,
    GM_info.script.author
  );

  const { setProgress, popup } = HWHFuncs;

  const { buttons } = HWHData;

  buttons["autokech"] = {
    name: "Аўтафарм",
    title: "Аутаматычны фарм ресурсаў партрэбных героям",
    color: "green",
    onClick: async () => {
      const is_raid = await check_raid();
      if (!is_raid) {
        setProgress(
          "Вы не валодаеце залатым квітком і ваш VIP не дазваляе праводзіць рэйды"
        );
        return;
      }
      ff();
    },
  };

  async function hnc() {
    const Heroes = await Send({
      calls: [{ name: "heroGetAll", args: {}, ident: "body" }],
    }).then((r) => r.results[0].result.response);

    return Object.values(Heroes)
      .map((h) => {
        const slots = lib.data.hero[h.id].color[h.color].items
          .map((val, ind) => h.slots[ind] ?? val)
          .filter(Number);
        return {
          id: h.id,
          name: cheats.translate(`LIB_HERO_NAME_${h.id}`),
          color: h.color,
          slots: slots,
          power: h.power,
        };
      })
      .filter((h) => h.slots.reduce((a, s) => a + s, 0) > 0)
      .sort((a, b) => b.power - a.power);
  }

  async function ff(autoStart = false) {
    const h = localStorage.getItem(`autofarm_heroes_${userId}`);
    const hhh = JSON.parse(h) || {};
    const heroes = await hnc();
    let sel = heroes.slice(0, 10).map((hero) => {
      let selected = false;
      if (Array.isArray(hhh)) {
        selected = hhh.includes(hero.id);
      } else if (hhh[hero.id]) {
        selected = hhh[hero.id].includes(hero.color);
      }
      return {
        name: hero.id,
        label: cheats.translate(`LIB_HERO_NAME_${hero.id}`),
        checked: selected,
      };
    });

    let answer = false;
    if (autoStart) {answer = true;}
     else { answer = await popup.confirm(
      "Выбери героев",
      [
        { result: false, isClose: true },
        { msg: "Ok", result: true, isInput: false },
      ],
      sel
    ); }
    if (answer) {
      const taskList = popup.getCheckBoxes();
      let selectedHeroes = taskList
        .filter((checkBox) => checkBox.checked)
        .map((checkBox) => Number(checkBox.name));
      let selected = undefined;
      if (selectedHeroes.length > 0) {
        localStorage.setItem(
          `autofarm_heroes_${userId}`,
          JSON.stringify(selectedHeroes)
        );
        selected = selectedHeroes;

        sel = selectedHeroes.map((id) => {
          let hero = heroes.find((h) => h.id == id);
          return Array.from(
            { length: 18 - hero.color + 1 },
            (_, i) => i + hero.color
          ).map((c) => ({
            color: cheats.translate(lib.data.enum.heroColor[c].locale_key),
            name: `${hero.id}|${c}`,
            checked: hhh[hero.id]?.includes(c) || false,
            label: `${hero.name} - ${cheats.translate(
              lib.data.enum.heroColor[c].locale_key
            )} ${lib.data.enum.heroColor[c].ident.match(/\+/g)?.length || ""}`,
          }));
        });

        if (autoStart) {answer = true;} 
        else {answer = await popup.confirm(
          "Выбери ранги",
          [
            { result: false, isClose: true },
            { msg: "Ok", result: true, isInput: false },
          ],
          sel.flat()
        );}
        if (answer) {
          const taskList = popup.getCheckBoxes();
          let selectedRangs = taskList
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
            localStorage.setItem(
              `autofarm_heroes_${userId}`,
              JSON.stringify(selectedRangs)
            );
            selected = selectedRangs;
          }
        }
      }
      hh(selected);
    }
  }

  async function check_raid() {
    const [userInfo, userInventory] = await Send({
      calls: [
        { name: "userGetInfo", args: {}, ident: "group_0_body" },
        { name: "inventoryGet", args: {}, ident: "group_1_body" },
      ],
    }).then((r) => r.results);
    const vipLevel = Math.max(
      ...lib.data.level.vip
        .filter((l) => l.vipPoints <= +userInfo.result.response.vipPoints)
        .map((l) => l.level)
    );

    return vipLevel >= 1 || !!userInventory.result.response.consumable[151];
  }

  async function hh(heroes) {
    let lo = [];
    let hs = await hnc();

    if (!heroes || (Array.isArray(heroes) && heroes.length == 0)) {
      let her = hs[0];
      lo = her.slots.reduce((acc, i) => {
        acc[i] = 1 + ~~acc[i];
        return acc;
      }, {});
      console.info(
        `Качаем: '${cheats.translate(`LIB_HERO_NAME_${her.id}`)}'`,
        true
      );
    } else {
      if (Array.isArray(heroes)) {
        lo = heroes.reduce((acc, id) => {
          let her = hs.find((e) => e.id == id);
          her.slots.forEach((s) => (acc[s] = 1 + ~~acc[s]));
          return acc;
        }, {});
        let co = heroes
          .map((id) => `\t${cheats.translate(`LIB_HERO_NAME_${id}`)}`)
          .join("<br />");
        console.info(`Качаем:<br/>${co}`);
      } else {
        let co = Object.keys(heroes)
          .map((id) => {
            hero = {
              id,
              name: cheats.translate(`LIB_HERO_NAME_${id}`),
              colors: heroes[id].map((c) => ({
                name: cheats.translate(lib.data.enum.heroColor[c].locale_key),
                count: lib.data.enum.heroColor[c].ident.match(/\+/g)?.length,
              })),
            };

            return `\t${hero.name}(${hero.id}) - [${hero.colors
              .map((c) => c.name + c.count)
              .join("|")}]`;
          })
          .join("<br />");
        console.info(`Качаем:<br/>${co}`);
        lo = Object.keys(heroes).reduce((acc, id) => {
          let her = hs.find((e) => e.id == id);
          let h_items = heroes[id]
            .filter((l) => l >= her.color)
            .reduce((acc1, color) => {
              let items = lib.data.hero[id].color[color].items;

              if (her.color == color) {
                items = her.slots;
              }
              items.forEach((item) => {
                acc1[item] = 1 + ~~acc1[item];
              });

              return acc1;
            }, {});
          Object.entries(h_items).forEach(([k, v]) => {
            acc[k] = v + ~~acc[k];
          });

          return acc;
        }, {});
      }
    }

    let needs = Object.keys(lo).map(
      (k) => `${cheats.translate(`LIB_GEAR_NAME_${k}`)}(${k}) - ${lo[k]}`
    );
    console.log("Патрэбна", needs);

    //lib.data.inventoryItem.gear[209]?.craftRecipe?.gear

    start(lo);
  }

  const AutoMissions = {
    inventory: undefined,
    missions: undefined,
    availableMissionsToRaid: undefined,
    userInfo: undefined,
    Reward2Mission: undefined,

    async start(resources = {}) {
      const f0 = (obj, count = 1) => {
        if (count == 0) {
          return undefined;
        }
        delete obj.gold;
        let res = undefined;
        for (let item of Object.keys(obj)) {
          //gear scroll
          if (res?.count > 0) break;
          for (let id of Object.keys(obj[item])) {
            // 102
            if (res?.count > 0) break;
            if (obj[item][id] * count != 0) {
              const countInv = this.inventory[item][id] ?? 0;
              if (obj[item][id] * count > countInv) {
                const rec = lib.data.inventoryItem[item][id].craftRecipe;
                if (rec) {
                  res = f0(rec, obj[item][id] * count - countInv);
                } else {
                  const capitalized =
                    item.charAt(0).toUpperCase() + item.slice(1);
                  let h = this.inventory[`fragment${capitalized}`][id] || 0;
                  if (lib.data.inventoryItem[item][id]?.fragmentMergeCost) {
                    res = {
                      key: `fragment${capitalized}`,
                      value: id,
                      count:
                        obj[item][id] *
                          count *
                          lib.data.inventoryItem[item][id]?.fragmentMergeCost
                            ?.fragmentCount -
                        h,
                    };
                  } else {
                    res = {
                      key: item,
                      value: id,
                      count: obj[item][id] * count - h,
                    };
                  }
                  if (res.count < 1) res = undefined;
                }
                const missions = searchMissions(res)
                  .map((id) => lib.data.mission[id])
                  .filter((m) => !m.isHeroic)
                  .map((x) => ({
                    id: x.id,
                    cost: x.normalMode.teamExp,
                  }));
                if (missions.length == 0) {
                  res = undefined;
                } else {
                  res.missions = missions;
                }
              } else {
                this.inventory[item][id] -= obj[item][id] * count;
              }
            }
          }
        }
        return res;
      };

      const searchMissions = (item) => {
        let out = [];
        if (item && this.Reward2Mission[item.key]) {
          out = this.Reward2Mission[item.key][item.value] ?? [];
        }
        return out;
      };

      let resp = await Send({
        calls: [
          { name: "inventoryGet", args: {}, ident: "group_0_body" },
          { name: "userGetInfo", args: {}, ident: "group_1_body" },
          { name: "missionGetAll", args: {}, ident: "group_2_body" },
        ],
      });
      this.inventory = resp.results[0].result.response;
      this.userInfo = resp.results[1].result.response;
      this.missions = resp.results[2].result.response;

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
        {}
      );

      const res = f0({ gear: resources });

      console.log("патрэбна", res); //  {"fragmentGear": "167", count: 32} => {key: "fragmentGear", value: "167", count: 32}
      if (res) {
        console.log(
          `Патрэбна: ${res.count} ${
            res.key.indexOf("fragmant") ? "фрагмент" : ""
          } ${cheats.translate(
            `LIB_${res.key.replace("fragment", "").toUpperCase()}_NAME_${
              res.value
            }`
          )} `
        );
        console.log("Можна атрымаць у миссіях", res.missions);
        localStorage.setItem("autofarm", JSON.stringify(res));

        return res;
      } else {
        return undefined;
      }
    },
  };

  async function start(items) {
    let res = await AutoMissions.start(items);
    if (!res) {
      setProgress(`Усе есць ці нельга здабыць`);
      return;
    }
    let stamina = AutoMissions.userInfo.refillable.find(
      (x) => x.id == 1
    ).amount;
    const vipLevel = Math.max(
      ...lib.data.level.vip
        .filter((l) => l.vipPoints <= +AutoMissions.userInfo.vipPoints)
        .map((l) => l.level)
    );
    const ress = [];
    while (res) {
      const mission = res.missions.find(
        (x) => x.id == Math.max(...res.missions.map((y) => y.id))
      );
      let times = 1;
      if (vipLevel >= 5) {
        times = 10;
      }
      let o = {
        name: res.key.indexOf("fragment")
          ? "фрагмент "
          : "" +
            cheats.translate(
              `LIB_${res.key.replace("fragment", "").toUpperCase()}_NAME_${
                res.value
              }`
            ),
        count: 0,
        used: 0,
      };

      while (stamina >= times * mission.cost && o.count < res.count) {
        let response = await Send({
          calls: [
            {
              name: "missionRaid",
              args: { id: mission.id, times },
              ident: "body",
            },
          ],
        }).then((x) => {
          if (x.error) {
            console.error(x.error);
            return {};
          }
          return x.results[0].result.response;
        });

        let c = Object.values(response).reduce((acc, reward) => {
          acc += Object.keys(reward).reduce((acc2, object) => {
            if (res.key == object) {
              let o = Object.keys(reward[object]).find((x) => x == res.value);
              if (o) {
                acc2 += reward[object][o];
              }
            }
            return acc2;
          }, 0);
          return acc;
        }, 0);

        o.count += c;
        stamina -= mission.cost * times;
        o.used += mission.cost * times;

        setProgress(
          `Атрымалі: ${o.count} / ${res.count} '${
            o.name
          }' <br> выкарыставана энки ${o.used} (${(o.used / o.count).toFixed(
            2
          )})`
        );
      }
      if (o.count > 0) {
        ress.push(o);
      }

      if (stamina < times * mission.cost) {
        setProgress(`Не хапае энки`);
        break;
      }
      res = await AutoMissions.start(items);
      stamina = AutoMissions.userInfo.refillable.find((x) => x.id == 1).amount;
    }
    if (ress.length > 0) {
      let con = ress
        .map(
          (o) =>
            `${o.count} '${o.name}' выкарыстана энки ${o.used} (${(
              o.used / o.count
            ).toFixed(2)})`
        )
        .join("<br>");
      setProgress(`Атрымалі:<br>${con}`);
    } else {
      setProgress("Нічога не атрымалі. (Не дастаткова энкі ці ўсе есць)");
    }
  }
  /*
   * ff will now receives 1 argument, if it's true it will farm automatically. startFarm passes true into it, 
  but it should pass a variable that's linked to user settings later (maybe added to the HWH "Settings" dropdown
  */
function startFarm() {
  ff(true);
}
setTimeout(startFarm,34e3);
})();
