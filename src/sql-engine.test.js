import test from 'node:test';
import assert from 'node:assert/strict';
import { runSQL } from './sql-engine.js';

test('nivel 1: filtra frutas amarillas con SELECT y WHERE', () => {
  const result = runSQL(1, "SELECT nombre FROM frutas WHERE color = 'amarillo';");
  assert.equal(result.ok, true);
  assert.equal(result.complete, true);
  assert.deepEqual(result.rows, [{ nombre: 'Plátano' }, { nombre: 'Limón' }]);
});

test('nivel 1: rechaza ORDER BY antes de tiempo', () => {
  assert.equal(runSQL(1, 'SELECT nombre FROM juguetes ORDER BY estrellas;').ok, false);
});

test('nivel 1: muestra ayuda para una condición válida pero incorrecta', () => {
  const result = runSQL(1, "SELECT nombre FROM frutas WHERE color = 'rojo';");
  assert.equal(result.ok, true);
  assert.equal(result.complete, false);
  assert.deepEqual(result.rows, [{ nombre: 'Manzana' }]);
});

test('nivel 2: ordena por estrellas de menor a mayor', () => {
  const result = runSQL(2, 'SELECT nombre FROM juguetes ORDER BY estrellas ASC;');
  assert.equal(result.complete, true);
  assert.deepEqual(result.rows, [{ nombre: 'Cometa' }, { nombre: 'Yoyó' }, { nombre: 'Trompo' }]);
});

test('nivel 2: una consulta correcta en otro nivel no se acepta', () => {
  assert.equal(runSQL(2, "SELECT nombre FROM frutas WHERE color = 'amarillo';").ok, false);
});

test('nivel 3: INNER JOIN solo devuelve amigos con mascota coincidente', () => {
  const result = runSQL(3, 'SELECT amigos.nombre, mascotas.animal FROM amigos INNER JOIN mascotas ON amigos.id = mascotas.amigo_id;');
  assert.equal(result.complete, true);
  assert.deepEqual(result.rows, [
    { 'amigos.nombre': 'Ana', 'mascotas.animal': 'Gato' },
    { 'amigos.nombre': 'Leo', 'mascotas.animal': 'Perro' }
  ]);
});

test('solo permite una sentencia SQL', () => {
  assert.equal(runSQL(1, "SELECT nombre FROM frutas WHERE color = 'amarillo'; SELECT * FROM frutas;").ok, false);
});
