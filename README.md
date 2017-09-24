# Generador de flyers con info de Google Spreadhseets

Usar este script para generar flyers personalizados por cada renglón contenido en un Google Spreadsheet. Ejemplo:

De este Google Spreadhseet:
![x](https://github.com/pa-w/aquinecesitamos/raw/master/samples/gdoc.png)

a esta imagen en formato PNG, lista para tweetearse:
![sample](https://github.com/pa-w/aquinecesitamos/raw/master/samples/sample.png "screenshot 1")

Nota: Para utilizar Spreadsheets que no son públicas, se necesita generar el archivo gdrive.key.json que puede ser generado siguiendo las instrucciones incluídas en la [documentación de Google Spreadhseet](https://www.npmjs.com/package/google-spreadsheet).

Para personalizar el orden de las columnas y la posición de cada texto es necesario (de momento) modificar el código. Es muy sencillo:

Para modificar el órden de las columnas, usar la variable translate, la cual es un objeto cuyas llaves son los números de columnas y los valores son el nombre de la variables (arbitrarios)

```
var translate = {"1": "alerta", "2": "brigadistas", "3": "requeridos", "4": "admitidos", "5": "no_requeridos", "6": "direccion", "7": "zona", "8": "detalle", "9": "actualizacion"};
```

Significa que la columna 1 de nuestro spreadsheet se llamará "alerta" en la matriz generada. Igual los demás elementos en el objeto.

Para modificar la posición de cada texto, se necesita modificar la variable txtConf y agregar una llave con el nombre de variable que definimos en translate ("alerta", en el ejemplo anterior). Así:

```
var txtConf = {
  alerta: {font: 'bold', size: 100, x: 50, y: 200, color: 'white', text: (a, r) => { return a.toUpperCase (); } },
}
```

Como se puede ver, casi todas las variables aceptan una funcion como callback para poder manipular los valores dependiendo de acuerdo a cada renglón.

Para correr el script se utiliza nodejs:

```
node google_spreadsheet_image_generator.js
```

El cual producirá una imagen con renglón. El nombre de archivo es, en este caso (se podrá personalizar más adelante): output.<renglon>.<fecha de actualizacion>.png
  
  
## Roadmap
- [ ] Parametrizar la configuración
- [ ] JSON que incluya toda la información procesada incluyendo la url de cada imagen.
- [ ] Modularizar el código



