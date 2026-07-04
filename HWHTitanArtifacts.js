// ==UserScript==
// @name         HWHTitanArtifacts
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Паказвае неабходную колькасць артыфактау для тытанау
// @author       yukkon
// @match   		 https://www.hero-wars.com/*
// @match	       https://apps-1701433570146040.apps.fbsbx.com/*
// @icon         https://lh3.googleusercontent.com/a/ACg8ocI7HD7_lM6wzmL1Giq8A0gXjtlsiyMDXJx5sX8CmT5LX4NiJw2t=s315-c-no
// @grant        none
// @downloadURL  https://yukkon.github.io/HWExts/HWHTitanArtifacts.js
// @updateURL    https://yukkon.github.io/HWExts/HWHTitanArtifacts.js
// @homepage	   https://github.com/yukkon/HWExts
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
            .map((t) => cheats.translate(`LIB_HERO_NAME_${t}`))
            .join(", ");
          ht.push(`<li>${art_name}: ${need} (${tts})</li>`);
        });
        ht.push("</ul>");
        return ht.join("");
      });
  }
})();
