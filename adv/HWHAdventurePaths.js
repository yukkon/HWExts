// ==UserScript==
// @name          HWHAdventurePaths
// @namespace     http://tampermonkey.net/
// @version       0.0.5
// @description   Разлічвае аптымальныя маршруты па карце (3 гульца супраць монстрау)
// @author        yukkon
// @match         https://www.hero-wars.com/*
// @match         https://apps-1701433570146040.apps.fbsbx.com/*
// @grant         none
// @downloadURL   https://yukkon.github.io/HWExts/HWHAdventurePaths.js
// @updateURL     https://yukkon.github.io/HWExts/HWHAdventurePaths.js
// @homepage      https://github.com/yukkon/HWExts
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

  const { popup } = HWHFuncs;
  const { othersPopupButtons } = HWHData;

  // Парог ачкоу НЕ аднолькавы для усіх карт — ён вызначаецца тым, які
  // ключ ёсць у state.rewards.points (самы вялікі тыр узнагароды).
  // Раней тут была захардкожаная канстанта 700 (падгледжаная на карце
  // adv_strongford_3pl_hell), але на іншых картах (напр.
  // adv_angels_3pl_hell) верхні тыр можа быць 640 і менш — з
  // канстантай 700 салвер памылкова лічыу парог недасягальным, хаця
  // фактычна ён дасягаўся (пацверджана на жывых дадзеных res4→res5:
  // максімум 660 ачкоу, тыр 640, рэальна набрана 640).
  // Фолбэк 700 застаецца на выпадак, калі rewards.points раптам пусты.
  function getPointsThreshold(state) {
    const tiers = state?.rewards?.points
      ? Object.keys(state.rewards.points).map(Number)
      : [];
    if (tiers.length === 0) return 700; // fallback, ПРОВЕРИТЬ
    return Math.max(...tiers);
  }

  othersPopupButtons.push({
    msg: "Аптымальныя шляхі",
    title: "Разлічыць аптымальныя маршруты па карце для усіх гульцоу",
    result: async () => {
      const state = await Caller.send("adventure_getInfo");
      const html = solveAndRender(state);
      await popup.confirm(html, [{ result: false, isClose: true }]);
    },
    color: "violet",
  });

  // ============================================================
  // Солвер: рандамізаваны жадны алгарытм з мноствам спробаў, той жа
  // падыход, які мы выкарыстоувалі для аналізу Un.js.
  // ============================================================

  function buildAdjacency(nodes, paths) {
    const adj = {};
    nodes.forEach((n) => (adj[n.id] = new Set()));
    paths.forEach((p) => {
      adj[p.from_id].add(p.to_id);
      adj[p.to_id].add(p.from_id);
    });
    return adj;
  }

  function isTarget(nodeById, id) {
    const n = nodeById[id];
    return n && n.type === "TYPE_COMBAT" && n.state === "occupied";
  }

  // Крыніцы буфа для канкрэтнага пункта (напр. боса): усе from_id
  // з state.buffs, дзе to_id === nodeId. Выкарыстоуваецца толькі для
  // жорсткай блакіроукі атакі боса (гл. "unlocked" ніжэй) — на іншыя
  // пункты гэта правіла НЕ распаусюджваецца (баффы звычайных мэт
  // сервер дазваляе атакаваць свабодна, гл. каментар вышэй пра
  // "усмацненні свядома не улічваюцца").
  function getBuffSourceIds(state, nodeId) {
    return (state.buffs || [])
      .filter((b) => b.to_id === nodeId)
      .map((b) => b.from_id);
  }

  // Ацэнка "кошту" пункта ў ачках. Для ужо зафармленых (state: "empty")
  // кошт вядомы дакладна — гэта n.pointsFarmed. Для яшчэ не захопленых
  // (state: "occupied") гульнявы кліент дае pointsFarmed: 0 — рэальны
  // кошт становіцца вядомы толькі пасля захопу. ПРОВЕРИТЬ: тут
  // выкарыстоуваецца дапушчэнне, што усе звычайныя баявыя пункты дают
  // аднолькавую колькасць ачкоу (вылічана як самае частае значэнне
  // pointsFarmed сярод ужо зафармленых пунктаў, з fallback 20), а
  // lastBoss-пункт можа каштаваць іначай — гэта не пацверджана дадзенымі
  // і патрабуе праверкі на жывым баі.
  function computeDefaultNodeValue(nodes) {
    const counts = new Map();
    nodes.forEach((n) => {
      if (
        n.type === "TYPE_COMBAT" &&
        n.state === "empty" &&
        typeof n.pointsFarmed === "number" &&
        n.pointsFarmed > 0
      ) {
        counts.set(n.pointsFarmed, (counts.get(n.pointsFarmed) || 0) + 1);
      }
    });
    if (counts.size === 0) return 20; // fallback, ПРОВЕРИТЬ
    let bestVal = 20;
    let bestCount = -1;
    for (const [val, cnt] of counts.entries()) {
      if (cnt > bestCount) {
        bestCount = cnt;
        bestVal = val;
      }
    }
    return bestVal;
  }

  function computePointsBaseline(nodes) {
    return nodes
      .filter((n) => n.type === "TYPE_COMBAT" && n.state === "empty")
      .reduce((a, n) => a + (n.pointsFarmed || 0), 0);
  }

  function bfsDist(adj, src) {
    const dist = { [src]: 0 };
    const q = [src];
    while (q.length) {
      const cur = q.shift();
      for (const nb of adj[cur]) {
        if (!(nb in dist)) {
          dist[nb] = dist[cur] + 1;
          q.push(nb);
        }
      }
    }
    return dist;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomGreedyPath(
    adj,
    nodeById,
    allTargets,
    distFromTarget,
    requiredSet,
    bossBuffSources,
    start,
    turns,
    covered,
    unlocked,
    rng,
    jitterScale,
  ) {
    let cur = start;
    let remaining = turns;
    const path = [cur];
    const visitedOwn = new Set([cur]);
    const newly = new Set();
    const localCovered = new Set(covered);
    // Наведаныя (разблакіраваныя) пункты — скразны набор паміж гульцамі,
    // патрэбны толькі для праверкі "усе крыніцы буфа боса ужо узятыя".
    // Стартавы пункт гульца лічыцца наведаным адразу.
    const localUnlocked = new Set(unlocked);
    localUnlocked.add(cur);

    while (remaining > 0) {
      const neighbors = Array.from(adj[cur] || []);
      if (neighbors.length === 0) break;
      const candidates = [];
      for (const nb of neighbors) {
        // Жорсткая блакіроука: калі сусед — бос (яшчэ occupied) пад
        // буфам, і не усе крыніцы гэтага буфа яшчэ разблакіраваны
        // (наведаныя любым гульцом раней ці у гэтым жа праходзе) —
        // атака боса пакуль недапушчальная, кандыдат цалкам
        // выключаецца з разгляду на гэтым кроку.
        const bossSources = bossBuffSources.get(nb);
        if (bossSources && bossSources.size > 0) {
          const allSourcesUnlocked = Array.from(bossSources).every((sid) =>
            localUnlocked.has(sid),
          );
          if (!allSourcesUnlocked) continue;
        }

        const nbIsNewTarget = isTarget(nodeById, nb) && !localCovered.has(nb);

        let score = 0;
        const nbIsRequired = requiredSet.has(nb) && !localCovered.has(nb);
        if (nbIsRequired) score += 1000000;
        else if (nbIsNewTarget) score += 100;

        let potential = 0;
        for (const t of allTargets) {
          if (localCovered.has(t) || t === nb) continue;
          const d = distFromTarget[t][nb];
          if (d !== undefined && d <= remaining - 1) {
            const weight = requiredSet.has(t) ? 5000 : 1;
            potential += weight / (1 + d);
          }
        }
        score += potential;
        // Ці мае гэты ход хоць нейкую стратэгічную каштоўнасць (мэта,
        // абавязковы пункт, або магчымасць дабрацца да чагосьці
        // карыснага пазней). Калі НІ АДЗІН з суседзяу гэтага не дае —
        // далейшы рух бессэнсоуны, трэба спыніцца, а не марна траціць
        // астатнія хады.
        const hasValue = nbIsRequired || nbIsNewTarget || potential > 0;
        if (visitedOwn.has(nb)) score -= 50;
        score += rng() * jitterScale;
        candidates.push({ nb, score, hasValue });
      }
      if (candidates.length === 0) break;
      if (!candidates.some((c) => c.hasValue)) break;
      candidates.sort((a, b) => b.score - a.score);
      cur = candidates[0].nb;
      path.push(cur);
      visitedOwn.add(cur);
      localUnlocked.add(cur);
      remaining -= 1;
      if (isTarget(nodeById, cur) && !localCovered.has(cur)) {
        localCovered.add(cur);
        newly.add(cur);
      }
    }
    return { path, newly, unlockedAfter: localUnlocked };
  }

  function solve(state, attempts = 20000) {
    const nodeById = {};
    state.nodes.forEach((n) => (nodeById[n.id] = n));
    const adj = buildAdjacency(state.nodes, state.paths);
    const allTargets = state.nodes
      .filter((n) => isTarget(nodeById, n.id))
      .map((n) => n.id);
    const distFromTarget = {};
    allTargets.forEach((t) => (distFromTarget[t] = bfsDist(adj, t)));

    const pointsThreshold = getPointsThreshold(state);

    // Абавязковыя пункты — шукаем па lastBoss === true (а не па індэксе,
    // ён не стабільны). Вылічваецца тут, бо state прыходзіць жывы, кожны
    // раз наноуа праз Caller.send.
    // ВАЖНА: калі бос ужо забіты раней (state: "empty"), ён больш не
    // з'яуляецца мэтай (isTarget() = false) і ніколі не патрапіу бы у
    // "covered" — раней гэта прыводзіла да таго, што салвер вечна лічыу
    // абавязковую умову невыкананай і/або дарэмна цягнуу гульца да ужо
    // мёртвага боса дзеля згаданага бонусу у скорынгу. Таму у
    // requiredNodes трапляюць толькі яшчэ НЕ занятыя (occupied) босы.
    const requiredNodes = state.nodes
      .filter((n) => n.lastBoss === true && n.state === "occupied")
      .map((n) => n.id);
    const requiredSet = new Set(requiredNodes);

    // Ачкі: базавая сума ужо зафармленых пунктаў + дапушчаны кошт аднаго
    // яшчэ не захопленага баявога пункта (гл. каментар да
    // computeDefaultNodeValue вышэй).
    const pointsBaseline = computePointsBaseline(state.nodes);
    const defaultNodeValue = computeDefaultNodeValue(state.nodes);
    const pointsNeeded = Math.max(0, pointsThreshold - pointsBaseline);

    // Максімальна магчымая сума ачкоу, калі б удалося захапіць УСЕ яшчэ
    // не занятыя баявыя пункты — для праверкі дасягальнасці парога.
    const maxPossiblePoints =
      pointsBaseline + allTargets.length * defaultNodeValue;
    const pointsThresholdUnreachable = maxPossiblePoints < pointsThreshold;

    // Заувага: усмацненні (state.buffs) НЕ ULічваюцца салверам для
    // звычайных мэт — сервер дазваляе атакаваць забафаваны пункт
    // свабодна. ВЫКЛЮЧЭННЕ (дададзена пазней): для боса (lastBoss)
    // дзейнічае жорсткае правіла — калі на боса накіраваны актыуны буф
    // (state.buffs, to_id === бос), атакаваць яго нельга, пакуль УСЕ
    // крыніцы гэтага буфа (from_id) не будуць наведаны хоць адным
    // гульцом. Прычына: гульцы хочуць спачатку вызваліць пункты, якія
    // даюць буф боса, а толькі потым ісці на самога боса.
    const bossBuffSources = new Map();
    requiredNodes.forEach((id) => {
      bossBuffSources.set(id, new Set(getBuffSourceIds(state, id)));
    });

    // Пачатковае мноства "разблакіраваных" (наведаных) пунктаў — усе
    // пункты, якія ужо НЕ occupied да старту сесіі (зачышчаны раней),
    // лічацца наведанымі адразу, чакаць іх наведвання у бягучым
    // разліку не трэба (аналагічна ранейшаму падыходу з unlocked для
    // звычайных буфаў, гл. вядомыя баги вышэй).
    const initialUnlocked = new Set(
      state.nodes.filter((n) => n.state !== "occupied").map((n) => n.id),
    );

    const players = Object.values(state.users).map((u) => ({
      id: u.id,
      name: u.user.name || u.id,
      start:
        typeof u.currentNode === "string"
          ? Number(u.currentNode)
          : u.currentNode,
      turns: u.turnsLeft,
    }));

    // Праверка дасяжнасці: хаця б адзін гулец павінен паспяваць даехаць
    // да кожнай абавязковай кропкі ў межах сваіх хадоу.
    const unreachable = requiredNodes.filter(
      (rid) =>
        !players.some((p) => {
          const d = distFromTarget[rid]?.[p.start];
          return d !== undefined && d <= p.turns;
        }),
    );

    let best = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const rng = mulberry32(attempt * 7919 + 13);
      const jitterScale = 0.05 + (attempt % 20) * 0.1;
      const order = [...players];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      const covered = new Set();
      let unlockedShared = new Set(initialUnlocked);
      const result = {};
      for (const p of order) {
        const { path, newly, unlockedAfter } = randomGreedyPath(
          adj,
          nodeById,
          allTargets,
          distFromTarget,
          requiredSet,
          bossBuffSources,
          p.start,
          p.turns,
          covered,
          unlockedShared,
          rng,
          jitterScale,
        );
        newly.forEach((x) => covered.add(x));
        unlockedShared = unlockedAfter;
        result[p.id] = { path, newly: Array.from(newly) };
      }

      const requiredOk = requiredNodes.every((rid) => covered.has(rid));
      const bestRequiredOk =
        best && requiredNodes.every((rid) => best.covered.has(rid));

      const totalPoints =
        pointsBaseline +
        Array.from(covered).reduce(
          (a, id) => a + (nodeById[id]?.pointsFarmed || defaultNodeValue),
          0,
        );
      const pointsOk = totalPoints >= pointsThreshold;
      const bestPointsOk =
        best &&
        pointsBaseline +
          Array.from(best.covered).reduce(
            (a, id) => a + (nodeById[id]?.pointsFarmed || defaultNodeValue),
            0,
          ) >=
          pointsThreshold;

      const better =
        !best ||
        (requiredOk && !bestRequiredOk) ||
        (requiredOk === bestRequiredOk && pointsOk && !bestPointsOk) ||
        (requiredOk === bestRequiredOk &&
          pointsOk === bestPointsOk &&
          covered.size > best.covered.size);

      if (better) {
        best = {
          covered: new Set(covered),
          unlocked: new Set(unlockedShared),
          result,
          attempt,
          requiredOk,
          pointsOk,
          totalPoints,
        };
      }
    }

    return {
      best,
      players,
      allTargets,
      requiredNodes,
      unreachable,
      pointsBaseline,
      pointsNeeded,
      pointsThreshold,
      pointsThresholdUnreachable,
      defaultNodeValue,
      bossBuffSources,
    };
  }

  function solveAndRender(state) {
    const {
      best,
      players,
      allTargets,
      requiredNodes,
      unreachable,
      pointsBaseline,
      pointsThreshold,
      pointsThresholdUnreachable,
      defaultNodeValue,
      bossBuffSources,
    } = solve(state);
    const uncovered = allTargets.filter((t) => !best.covered.has(t));

    // Дыягностыка: калі бос абавязковы, але не захоплены — праверым, ці
    // прычына у нявзятых крыніцах яго буфа (жорсткая блакіроука), каб
    // паказаць гульцу канкрэтную прычыну, а не проста "не атрымалася".
    const bossBuffWarnings = [];
    requiredNodes.forEach((rid) => {
      const sources = bossBuffSources.get(rid);
      if (sources && sources.size > 0) {
        const missing = Array.from(sources).filter(
          (sid) => !best.unlocked.has(sid),
        );
        if (missing.length) {
          bossBuffWarnings.push(
            `Бос ${rid}: не узятыя крыніцы буфа (${missing.join(", ")}) — атака боса заблакіравана, пакуль яны не захопленыя.`,
          );
        }
      }
    });

    const ht = [];
    ht.push("<div class='result'>");
    if (unreachable.length) {
      ht.push(
        `<p style="color:red"><b>Увага: недасягальныя абавязковыя пункты (ні адзін гулец не паспявае): ${unreachable.join(", ")}</b></p>`,
      );
    } else if (requiredNodes.length && !best.requiredOk) {
      ht.push(
        `<p style="color:red"><b>Увага: салвер не знайшоу шлях, які захоплівае усе абавязковыя пункты (${requiredNodes.join(", ")}) — паспрабуй павялічыць колькасць спробаў.</b></p>`,
      );
      bossBuffWarnings.forEach((w) => ht.push(`<p style="color:red">${w}</p>`));
    } else if (requiredNodes.length) {
      ht.push(
        `<p style="color:green"><b>Абавязковыя пункты захопленыя: ${requiredNodes.join(", ")}</b></p>`,
      );
    }
    if (pointsThresholdUnreachable) {
      ht.push(
        `<p style="color:red"><b>Увага: нават захапіушы усе даступныя пункты, парог ${pointsThreshold} ачкоу не дасягаецца (максімум: ${pointsBaseline + allTargets.length * defaultNodeValue}).</b></p>`,
      );
    } else if (!best.pointsOk) {
      ht.push(
        `<p style="color:red"><b>Увага: не удалося набраць ${pointsThreshold} ачкоу (атрымана: ${best.totalPoints}) — паспрабуй павялічыць колькасць спробаў.</b></p>`,
      );
    } else {
      ht.push(
        `<p style="color:green"><b>Ачкі: ${best.totalPoints} / ${pointsThreshold} (парог дасягнуты)</b></p>`,
      );
    }
    ht.push(
      `<p><b>Пакрыта: ${best.covered.size} / ${allTargets.length}</b></p>`,
    );
    for (const p of players) {
      const r = best.result[p.id];
      ht.push(`<p><b>${p.name}</b> (старт: ${p.start}, хады: ${p.turns})<br>`);
      ht.push(`Шлях: ${r.path.join(" → ")}<br>`);
      ht.push(`Новыя точкі: ${r.newly.join(", ") || "—"}</p>`);
    }
    if (uncovered.length) {
      ht.push(`<p>Не ахоплена: ${uncovered.join(", ")}</p>`);
    }
    ht.push("</div>");
    return ht.join("");
  }
})();
