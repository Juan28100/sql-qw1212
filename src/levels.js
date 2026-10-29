export const levels = [
  {
    id: 1,
    concept: 'SELECT + WHERE',
    title: 'Busca frutas amarillas',
    task: 'Muestra el nombre de las frutas cuyo color es amarillo.',
    hint: 'SELECT nombre FROM frutas WHERE color = …',
    example: "SELECT nombre FROM frutas WHERE color = 'amarillo';",
    boards: [
      { title: 'frutas', columns: ['nombre', 'color'], rows: [['Manzana', 'rojo'], ['Plátano', 'amarillo'], ['Limón', 'amarillo'], ['Uva', 'morado']] }
    ]
  },
  {
    id: 2,
    concept: 'ORDER BY',
    title: 'Ordena los juguetes',
    task: 'Muestra sus nombres, desde el que tiene menos estrellas.',
    hint: 'SELECT nombre FROM juguetes ORDER BY … ASC',
    example: 'SELECT nombre FROM juguetes ORDER BY estrellas ASC;',
    boards: [
      { title: 'juguetes', columns: ['nombre', 'estrellas'], rows: [['Trompo', '3'], ['Cometa', '1'], ['Yoyó', '2']] }
    ]
  },
  {
    id: 3,
    concept: 'INNER JOIN',
    title: 'Junta amigos y mascotas',
    task: 'Muestra cada amigo junto a su mascota. Solo las parejas que coinciden.',
    hint: 'Une amigos.id con mascotas.amigo_id.',
    example: 'SELECT amigos.nombre, mascotas.animal FROM amigos INNER JOIN mascotas ON amigos.id = mascotas.amigo_id;',
    boards: [
      { title: 'amigos', columns: ['id', 'nombre'], rows: [['1', 'Ana'], ['2', 'Leo'], ['3', 'Sol']] },
      { title: 'mascotas', columns: ['amigo_id', 'animal'], rows: [['1', 'Gato'], ['2', 'Perro'], ['4', 'Pez']] }
    ]
  }
];
