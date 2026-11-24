# Catálogos, bloques y plantillas de Plano 2D y Casa 3D

Todo lo que sale en las bibliotecas (puertas, ventanas, muebles…) y en «Nuevo · plantillas / ejemplos» está en archivos **JSON** que se pueden editar con cualquier editor de texto (el Editor HTML del taller, el Bloc de notas, VS Code…). **No hace falta tocar el código.** Después de cambiar algo, `bash publicar.sh` y en 1-2 minutos está en la web.

| Qué | Dónde |
|---|---|
| Lista de catálogos | `comun/catalogos/indice.json` |
| Un catálogo (una categoría: dormitorio, aula, taller…) | `comun/catalogos/<nombre>.json` |
| Plantillas de Plano 2D | `plano2d/plantillas/indice.json` y sus `.plano.json` |
| Ejemplos de Casa 3D | `casa3d/ejemplos/indice.json` y sus `.casa3d.json` |

> Ojo con las comas: en JSON cada elemento de una lista va separado por coma, pero **el último no lleva coma**. Si un catálogo tiene un error, la app avisa arriba de la pestaña *Bloques* / *Catálogo* y carga los demás. Para comprobarlos todos a la vez: `node tools/pruebas/sintaxis.js`.

## 1. Añadir un mueble o un bloque a un catálogo que ya existe

Abre, por ejemplo, `comun/catalogos/aula.json` y añade un bloque dentro de `"bloques": [ … ]`:

```json
{
  "id": "papelera",
  "nombre": "Papelera",
  "en": "Bin",
  "medidas": { "ancho": 30, "fondo": 30, "alto": 40 },
  "color": "#2f5f8f",
  "planta": [
    { "circulo": ["ancho/2", "fondo/2", "ancho/2"] }
  ],
  "piezas": [
    { "cilindro": ["ancho/2", "fondo/2", 0, "ancho/2", "alto"] }
  ]
}
```

- **`id`**: sin espacios ni tildes, único dentro del catálogo.
- **`nombre`** y **`en`**: en español y en inglés (salen los dos).
- **`medidas`**: en la unidad del catálogo (`"unidad": "cm"` arriba del archivo). `ancho` es la x, `fondo` la y y `alto` la altura. El alumnado las puede cambiar después.
- **`parametros`** (opcional): números que no son medidas, por ejemplo `{ "baldas": 5 }` o `{ "peldanos": 15 }`.
- **`color`**: el color en 3D (y en la planta de Casa 3D).

### El dibujo en planta (`planta`)

El bloque se dibuja con su esquina de abajo a la izquierda en (0, 0); la **parte de atrás** (la que va contra la pared) es la de arriba, `y = fondo`. Elementos posibles:

| Elemento | Formato |
|---|---|
| Rectángulo | `{ "rect": [x, y, ancho, alto] }` |
| Línea o polilínea abierta | `{ "linea": [x1, y1, x2, y2, x3, y3…] }` |
| Polígono cerrado | `{ "poligono": [x1, y1, x2, y2, …] }` |
| Círculo | `{ "circulo": [cx, cy, radio] }` |
| Arco | `{ "arco": [cx, cy, radio, ánguloInicial, ánguloFinal] }` (grados, en sentido antihorario) |
| Texto | `{ "texto": [x, y, "M"], "h": 2.5 }` (h = altura en mm del papel) |
| Repetir | `{ "repetir": { "n": "baldas", "var": "i", "elementos": [ … ] } }` |

A cualquier elemento se le puede añadir `"gruesa": true` (línea gruesa), `"trazo": "oculta"` (discontinua, por ejemplo un mueble colgado) o `"relleno": "#14201a"`.

### Las piezas en 3D (`piezas`)

Solo **cajas y cilindros** (así va rápido en los Chromebooks):

| Pieza | Formato |
|---|---|
| Caja | `{ "caja": [x, y, z, ancho, fondo, alto] }` (x, y, z = esquina de abajo) |
| Cilindro vertical | `{ "cilindro": [cx, cy, z, radio, alto] }` |
| Cilindro tumbado | `{ "cilindro": [x, cy, cz, radio, largo], "eje": "x" }` (o `"eje": "y"`) |

Cada pieza puede llevar su `"color"`; si no, usa el del bloque. `"mate": "cristal"` la hace transparente. También vale `repetir`.

### Fórmulas

En cualquier número se puede escribir una fórmula entre comillas con las medidas y los parámetros: `"ancho/2"`, `"fondo-30"`, `"(i+1)*alto/peldanos"`, `"min(ancho, fondo)/2"`. Funciones: `min`, `max`, `abs`, `sqrt`, `round`, `floor`, `ceil`, `sin`, `cos`, `tan` (en grados). Así, si el alumno cambia el ancho de la cama, la almohada se recoloca sola.

## 2. Añadir un catálogo nuevo (por ejemplo, símbolos eléctricos)

1. Copia `aula.json` como `electricidad.json` y cambia la cabecera:
   ```json
   "biblioteca": "Electricidad", "en": "Electrical",
   "categoria": "electricidad", "nombre": "Electricidad", "en_categoria": "Electrical symbols",
   "unidad": "cm",
   ```
   `biblioteca` es el grupo grande; `categoria` es el botón dentro de la biblioteca (y forma parte de la referencia del bloque: `electricidad/enchufe`).
2. Pon tus bloques. Un símbolo que solo es 2D no necesita `piezas` (en Casa 3D no se verá en 3D). Ejemplo de enchufe:
   ```json
   { "id": "enchufe", "nombre": "Enchufe", "en": "Socket", "medidas": { "ancho": 20, "fondo": 20 },
     "planta": [ { "arco": ["ancho/2", 0, "ancho/2", 0, 180] }, { "linea": ["ancho/2", "ancho/2", "ancho/2", "fondo"] } ] }
   ```
3. Añádelo a `comun/catalogos/indice.json`: `"catalogos": [ …, "electricidad.json" ]`.

## 3. Puertas y ventanas

Están en `arquitectura.json` con `"hueco": "puerta"` (o `puerta-doble`, `corredera`, `ventana`, `balconera`, `abertura`) y sus medidas por defecto (`ancho`, `alto`, `antepecho`). Se pueden añadir más tamaños (por ejemplo, una puerta de 70) copiando una línea y cambiando el `id` y el `ancho`; el dibujo de cada tipo lo hace la app.

## 4. Añadir una plantilla de Plano 2D

1. Dibuja la plantilla en Plano 2D (con su hoja, su escala y su cajetín) y pulsa **Guardar archivo**.
2. Copia el `.plano.json` de *Descargas* a `plano2d/plantillas/`.
3. Añádela a `plano2d/plantillas/indice.json`:
   ```json
   { "archivo": "aula-taller.plano.json", "nombre": "Aula taller", "en": "Workshop",
     "icono": "1:50", "descripcion": "Planta del taller para amueblar." }
   ```

## 5. Añadir un ejemplo de Casa 3D

Igual: hazlo en Casa 3D, **Guardar archivo**, copia el `.casa3d.json` a `casa3d/ejemplos/` y añádelo a `casa3d/ejemplos/indice.json`. Un ejemplo también puede ser un plano de Plano 2D (`"archivo": "../../plano2d/plantillas/dormitorio-modelo.plano.json"`). Los dos ejemplos que trae se generan con `node tools/generar-ejemplos.js` (si lo vuelves a ejecutar, los sobrescribe).

## 6. El formato de los archivos (para curiosos)

Plano 2D (`.plano.json`) y Casa 3D (`.casa3d.json`) usan **el mismo formato**: por eso Casa 3D abre los planos de Plano 2D. Todas las medidas se guardan en **milímetros reales**; `unidad` solo dice cómo se muestran (mm, cm o m) y `escala` cómo se ponen en el papel (`[1, 20]` = 1:20). Cada objeto de `entidades` tiene un `tipo`: `linea`, `polilinea`, `circulo`, `arco`, `texto`, `rayado`, `pared`, `hueco` (puerta o ventana de una pared), `bloque` (mueble), `suelo` y `cota`. Los bloques usados se copian dentro del archivo (`defs`), así el plano se ve bien aunque el catálogo cambie.
