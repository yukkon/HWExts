await Caller.send(["titanGetAll", "inventoryGet"]).then(([titanGetAll, inventoryGet]) => {
  const titanarts = Object.values(titanGetAll).map((titan) => {
    const arts = titan.artifacts.map((titan_art, i) => {
      const art_id = lib.data.titan[titan.id].artifacts[i];
      const type = lib.data.titanArtifact.id[art_id].type;
      const all_fragments = Object.values(lib.data.titanArtifact.type[type].evolution).filter(obj => obj.star > titan_art.star).reduce((acc, o) => acc + o.costFragmentsAmount, 0)
    
      return {
        id: art_id,
        need: all_fragments
      }
    });
    return arts;
  });

  return {
    inventoryGet,
    _arts: titanarts.flat().filter(a => a.need > 0)
  }
}).then(({inventoryGet, _arts}) => {
  const result = _arts.reduce((acc, a) => {
    if (!acc[a.id]) {
      acc[a.id] = 0;
    }
    acc[a.id] += a.need;
    return acc;
  }, {});


  return Object.entries(result).map(([id, need]) => `${cheats.translate(`LIB_TITAN_ARTIFACT_NAME_${id}`)}:${need-(inventoryGet.fragmentTitanArtifact[id] ?? 0)}`);
});
/*
current result:
"Искра Рагни:7670"
"Крушители Нефтиды:11507"
"Темная звезда Нефтиды:8382"
"Наручи Нефтиды:8764"
"Элитры Белава:9777"
"Корона Белава:10183"
"Лик Белава:8860"

needs results:
"Искра Рагни:7670 (Игнис)"
"Крушители Нефтиды:11507 (Брустар)"
"Темная звезда Нефтиды:8382 (Керос)"

*/