const tables = {
  frutas: [
    { nombre: 'Manzana', color: 'rojo' },
    { nombre: 'Plátano', color: 'amarillo' },
    { nombre: 'Limón', color: 'amarillo' },
    { nombre: 'Uva', color: 'morado' }
  ],
  juguetes: [
    { nombre: 'Trompo', estrellas: 3 },
    { nombre: 'Cometa', estrellas: 1 },
    { nombre: 'Yoyó', estrellas: 2 }
  ],
  amigos: [
    { id: 1, nombre: 'Ana' },
    { id: 2, nombre: 'Leo' },
    { id: 3, nombre: 'Sol' }
  ],
  mascotas: [
    { amigo_id: 1, animal: 'Gato' },
    { amigo_id: 2, animal: 'Perro' },
    { amigo_id: 4, animal: 'Pez' }
  ]
};

function cleanStatement(input) {
  const sql = String(input ?? '').trim();
  if (!sql || /--|\/\*|\*\/|;/.test(sql.replace(/;\s*$/, ''))) return null;
  return sql.replace(/;\s*$/, '').replace(/\s+/g, ' ');
}

function error(message) {
  return { ok: false, message, rows: [], columns: [] };
}

function ok(rows, columns, complete, message) {
  return { ok: true, rows, columns, complete, message };
}

export function runSQL(level, input) {
  const sql = cleanStatement(input);
  if (!sql) return error('Escribe una consulta y pon un solo punto y coma al final.');

  if (level === 1) {
    const match = sql.match(/^SELECT\s+(nombre|color)\s+FROM\s+frutas\s+WHERE\s+(nombre|color)\s*=\s*'([^']+)'$/i);
    if (!match) return error('En este nivel usamos SELECT, FROM frutas y WHERE. Mira las columnas del cartel.');
    const [, selectedRaw, filterRaw, valueRaw] = match;
    const selected = selectedRaw.toLowerCase();
    const filter = filterRaw.toLowerCase();
    const value = valueRaw.toLocaleLowerCase('es');
    const rows = tables.frutas
      .filter((fruit) => String(fruit[filter]).toLocaleLowerCase('es') === value)
      .map((fruit) => ({ [selected]: fruit[selected] }));
    const complete = selected === 'nombre' && filter === 'color' && value === 'amarillo';
    const message = complete
      ? '¡Muy bien! SELECT elige y WHERE busca. ¡Encontraste las frutas amarillas!'
      : '¡La consulta funciona! Revisa qué columna mostrar y qué valor buscar.';
    return ok(rows, [selected], complete, message);
  }

  if (level === 2) {
    const match = sql.match(/^SELECT\s+(nombre|estrellas)\s+FROM\s+juguetes\s+ORDER\s+BY\s+(nombre|estrellas)(?:\s+(ASC|DESC))?$/i);
    if (!match) return error('Ahora usamos ORDER BY para poner los juguetes en orden.');
    const [, selectedRaw, orderRaw, directionRaw] = match;
    const selected = selectedRaw.toLowerCase();
    const order = orderRaw.toLowerCase();
    const direction = (directionRaw || 'ASC').toUpperCase();
    const sign = direction === 'DESC' ? -1 : 1;
    const rows = [...tables.juguetes]
      .sort((a, b) => {
        const left = a[order];
        const right = b[order];
        return (typeof left === 'number' ? left - right : String(left).localeCompare(String(right), 'es')) * sign;
      })
      .map((toy) => ({ [selected]: toy[selected] }));
    const complete = selected === 'nombre' && order === 'estrellas' && direction === 'ASC';
    const message = complete
      ? '¡En orden! ORDER BY estrellas ASC va de menos a más.'
      : '¡Buen intento! Mira qué columna ordenas y si va de menos a más (ASC).';
    return ok(rows, [selected], complete, message);
  }

  if (level === 3) {
    const match = sql.match(/^SELECT\s+amigos\.nombre\s*,\s*mascotas\.animal\s+FROM\s+amigos\s+INNER\s+JOIN\s+mascotas\s+ON\s+amigos\.id\s*=\s*mascotas\.amigo_id$/i);
    if (!match) return error('Une amigos y mascotas con INNER JOIN. Compara amigos.id con mascotas.amigo_id.');
    const rows = [];
    for (const friend of tables.amigos) {
      for (const pet of tables.mascotas) {
        if (friend.id === pet.amigo_id) {
          rows.push({ 'amigos.nombre': friend.nombre, 'mascotas.animal': pet.animal });
        }
      }
    }
    return ok(rows, ['amigos.nombre', 'mascotas.animal'], true, '¡Lo lograste! INNER JOIN juntó las filas que tienen el mismo número.');
  }

  return error('¡Sigue el camino! Completa primero el nivel anterior.');
}

export function getTableData(tableName) {
  return tables[tableName] ? tables[tableName].map((row) => ({ ...row })) : [];
}
