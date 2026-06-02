// ==UserScript==
// @name         HWHTraTaTa
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  try to take over the world!
// @author       yukkon
// @match		 https://www.hero-wars.com/*
// @match		 https://apps-1701433570146040.apps.fbsbx.com/*
// @icon  	     https://lh3.googleusercontent.com/a/ACg8ocI7HD7_lM6wzmL1Giq8A0gXjtlsiyMDXJx5sX8CmT5LX4NiJw2t=s315-c-no
// @grant        none
// @downloadURL  https://yukkon.github.io/HWExts/Userscript.user.js
// @updateURL    https://yukkon.github.io/HWExts/Userscript.user.js
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

  const { setProgress, popup, Events } = HWHFuncs;

  function getTomData(recipe, level) {
    if (level === 1) {
      return { monets: 0, energy_to_up: 0 };
    }
    const prev = getTomData(recipe, level - 1);

    const energy_to_up = recipe[level];
    const monets = 100 * energy_to_up * (level - 1);
    return {
      monets: prev.monets + monets,
      energy_to_up: prev.energy_to_up + energy_to_up,
    };
  }

  function getGemData(recipe, tom_level, level) {
    if (level === 1) {
      return { monets: 0, energy_to_up: 0, discount: 100 };
    }

    const prev = getGemData(recipe, tom_level, level - 1);

    const energy_to_up = recipe[level];
    return {
      monets: prev.monets + 100 * tom_level * energy_to_up,
      energy_to_up: prev.energy_to_up + energy_to_up,
      discount: 100 * level,
    };
  }

  function getStoneData(recipe, tom_level, level) {
    if (level === 1) {
      return { monets: 0, energy_to_up: 0 };
    }

    const prev = getStoneData(recipe, tom_level, level - 1);

    const energy_to_up = recipe[level];
    let monets = 0;
    switch (level) {
      case 5:
        monets = 20000;
        break;
      case 10:
        monets = 40000;
        break;
      case 15:
        monets = 90000;
        break;
      case 20:
        monets = 140000;
        break;
    }

    return {
      monets: prev.monets + 100 * tom_level * energy_to_up + monets,
      energy_to_up: prev.energy_to_up + energy_to_up,
    };
  }

  function getData(str, rec_1, rec_2, rec_3) {
      const [tom_level, gem_level, stone_level] = str.split('-')
      const tom_data = getTomData(rec_1, Number(tom_level));
      const gem_data = getGemData(rec_2, Number(tom_level), Number(gem_level));
          const stone_data = getStoneData(
            rec_3,
            Number(tom_level),
            Number(stone_level),
          );
          console.log(str,{energy:
              tom_data.energy_to_up +
              gem_data.energy_to_up +
              stone_data.energy_to_up,
            buys:
              (tom_data.monets + gem_data.monets + stone_data.monets) /
              (2800 - gem_data.discount),
                      })
  }

  Events.on("startGame", async (r) => {

    const h = await fetch('https://raw.githubusercontent.com/yukkon/HWExts/refs/heads/main/exports/heroes.json').then(r => r.json())
    console.log("------", h, "------")

    const invasion = Object.values(lib.data.invasion.chapter).filter((i) => { const now = new Date(); return (now > new Date(i.startDate) && new Date(i.endDate) > now)})[0];
    if (!invasion) {
        console.log("Нет активных вторжений")
        return;
    }

    const relics = Object.values(lib.data.workshop.relic).filter(
      (r) => r.invasionId === invasion.invasionId,
    );
    const sourceCoinId = lib.data.invasion.list[invasion.invasionId].clientData.exchange.sourceCoinId
    const tom = relics.find(r => r.effect.type === "cashback_reward")
    const gem = relics.find(r => r.effect.type === "gachaReward_change")
    const stone = relics.find(r => r.effect.type === "buff_add")

    const workshopBuff_getInfo = await Caller.send("workshopBuff_getInfo").then(r => Object.values(r))
    const current_tom = workshopBuff_getInfo.find(rel => tom.id === String(rel.id))
    const current_gem = workshopBuff_getInfo.find(rel => gem.id === String(rel.id))
    const current_stone = workshopBuff_getInfo.find(rel => stone.id === String(rel.id))


    //.filter(t => t >= current_tom.level)//
    const rec_1 = Object.keys(tom.recipe).reduce((acc, i) => {acc[i]=tom.recipe[i].coin[sourceCoinId]; return acc}, {})
    const rec_2 = Object.keys(gem.recipe).reduce((acc, i) => {acc[i]=gem.recipe[i].coin[sourceCoinId]; return acc}, {})
    const rec_3 = Object.keys(stone.recipe).reduce((acc, i) => {acc[i]=stone.recipe[i].coin[sourceCoinId]; return acc}, {})

    const m_t = Object.keys(tom.recipe).filter(t => t <= current_tom.level).reduce((acc, i) => acc+tom.recipe[i].coin[sourceCoinId], 0)
    const m_g = Object.keys(gem.recipe).filter(t => t <= current_gem.level).reduce((acc, i) => acc+gem.recipe[i].coin[sourceCoinId], 0)
    const m_s = Object.keys(stone.recipe).filter(t => t <= current_stone.level).reduce((acc, i) => acc+stone.recipe[i].coin[sourceCoinId], 0)

    const inventory = await Caller.send("inventoryGet");
    const limit = inventory.coin[sourceCoinId]// + m_t + m_g + m_s;

    let limit_down = 0.8
    let limit_up = 1.2

    console.log("limit", limit)
    console.log("wtys", rec_1, rec_2, rec_3)

      window.getData = (stra) => {
        getData(stra, rec_1, rec_2, rec_3)
      }

    let limit_exided = false;
    const arr = [];
    for (const tom_level in rec_1) {
      const tom_data = getTomData(rec_1, Number(tom_level));

      if (tom_data.energy_to_up > limit) {
        limit_exided = true;
        break;
      }

      for (const gem_level in rec_2) {
        const gem_data = getGemData(rec_2, Number(tom_level), Number(gem_level));

        if (tom_data.energy_to_up + gem_data.energy_to_up > limit) {
          break;
        }

        //  const { monets: gem_monets, energy_to_up: gem_energy_to_up, discount } = getGemData(gem_level)
        for (const stone_level in rec_3) {
          const stone_data = getStoneData(
            rec_3,
            Number(tom_level),
            Number(stone_level),
          );
          //console.log(
          //  `${tom_level}-${gem_level}-${stone_level}`,
          //  tom_data,
          //  gem_data,
          //  stone_data,
          //);

          //console.log(
          //  `${tom_level}-${gem_level}-${stone_level}`,
          //  tom_data.energy_to_up +
          //    gem_data.energy_to_up +
          //    stone_data.energy_to_up,
          //  (tom_data.monets + gem_data.monets + stone_data.monets) /
          //    (2800 - gem_data.discount),
          //);
          arr.push({
            strategie: `${tom_level}-${gem_level}-${stone_level}`,
            energy:
              tom_data.energy_to_up +
              gem_data.energy_to_up +
              stone_data.energy_to_up,
            buys:
              parseInt((tom_data.monets + gem_data.monets + stone_data.monets) /
              (2800 - gem_data.discount)),
          });

          if (
            tom_data.energy_to_up +
              gem_data.energy_to_up +
              stone_data.energy_to_up >
            limit
          ) {
            break;
          }
        }
      }
    }

    console.log("sort by energy and buys",arr.sort((a, b) => Number(`${b.energy}${b.buys}`) - Number(`${a.energy}${a.buys}`)));

    console.log("sort by buys", arr.sort((a, b) => b.buys - a.buys));

   /* const str = "5-3-15"
    const s = arr.find(i => i.strategie === str)
    if (s) {
      const ss = arr.filter(i => i.energy === s.energy)
      console.log(`ON BASE ${str}`, ss)
    }*/

    const ss = arr.filter(i => i.energy >= limit*0.8 && i.energy <= limit * 1.2)
    console.log(`BY current (${limit}) LIMIT (80% - 120%)`, ss)
  });
})();
