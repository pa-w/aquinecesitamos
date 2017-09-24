var GoogleSpreadsheet = require('google-spreadsheet');
var gd = require ('node-gd');
var fs = require ('fs');
var async = require('async');

var doc = new GoogleSpreadsheet ('1mo9czjIQupWSkjyM--_RSusShy-WbHi8w28oBmxeufk');
var sheet, matrix = {};
var translate = {"1": "alerta", "2": "brigadistas", "3": "requeridos", "4": "admitidos", "5": "no_requeridos", "6": "direccion", "7": "zona", "8": "detalle", "9": "actualizacion"};
var fonts = {regular: './assets/font-regular.ttf', bold: './assets/font-bold.ttf' } 
var txtConf = {
	alerta: {font: 'bold', size: 100, x: 50, y: 200, color: 'white', text: (a, r) => { return a.toUpperCase (); } },
	zona: {font: 'bold', size: (a, r) => { return a.length > 20 ? 43 : 48 }, x: 500, y: 150, color: 'white', text: (a, r) => { return a.toUpperCase (); } },
	direccion: { size: 25, x: 500, y: 210},
	detalle: { size: 25, x: 500, y: 245 },
	requeridos: {size: 20, x: 45, y: 460, text: (a, r) => { if (r.brigadistas && r.brigadistas[0] == 's') { a = "Se necesitan brigadistas." + a; }  a = a.replace (/\./g, ',');  return a.replace (/,/g, "\n")}, multiline: true },
	admitidos: { size: 20, x: 755, y: 460, text: (a, r) => { a = a.replace (/\./g, ','); return a.replace(/,/g, "\n") }, multiline: true },
	no_requeridos: { size: 20, x: 1650, y: 500, text: (a, r) => { if (r.brigadistas && r.brigadistas[0] == 'n') { a = "No se necesitan brigadistas." + a; } a = a.replace (/\./g, ','); return a.replace(/,/g, "\n") }, multiline: true },
	actualizacion: { size: 70, x: 1550, y: 140, text: (a, r) => {[date, time] = a.split (' '); [year, day, month] = date.split('/'); return day + "." + month + " | " + time; }, color: (a, r) => { return r.alerta } }
};

function getTemplate (row) { 
	return './assets/alerta_' + row.alerta + '.png';
}

async.series ([
	function setAuth (step) {
		doc.useServiceAccountAuth (require ('./gdrive.key.json'), step);
	},
	function getInfoAndWorksheets (step) {
		doc.getInfo((error, info) => { 
			sheet = info.worksheets [0];	
			step ();
		})
		
	},
	function workingWithCells (step) {
		sheet.getCells ({
			'min-row': 6,
			'max-row': 15
		}, (err, cells) => { 
			if (err) return; 
			for (var c in cells) {
				var cell = cells [c];
				if (!matrix [cell.row]) matrix [cell.row] = {};
				if (translate [cell.col]) {
					matrix [cell.row] [translate [cell.col]] = cell.value;
				}
			}
			step ();
		})
	},
	function workWithMatrix (step) {
		for (var r in matrix) {
			var row = matrix [r], imgFile = getTemplate (row); 

			if (fs.existsSync (imgFile)) {
				gd.openFile (imgFile, (err, img) => {
					if (err) return;

					try {
						[date, time] = row.actualizacion.split (' ');
						[year,day,month] = date.split('/'), [hour,minute] = time.split(':');
						if (date && time) {

							/* Cambia los colores */

							var colors =  { white: img.colorAllocate (255, 255, 255), bajo: img.colorAllocate (209, 139,36), medio: img.colorAllocate (226, 111, 71), alto: img.colorAllocate (221, 62, 62) }
							colors.urgente  = colors.alto;

							for (var cnf in txtConf) { 
								var conf = txtConf [cnf], 
									text = (conf.text ? (typeof conf.text === "function" ? conf.text (row [cnf], row) : conf.text) : row [cnf]),
									color = (conf.color ? (typeof conf.color === "function" ? conf.color (row [cnf], row) : conf.color ) : 'white' ),
									font = (conf.font ? (typeof conf.font === "function" ? conf.font (row [cnf], row) : conf.font ) : 'regular' ),
									size = (conf.size ? (typeof conf.size === "function" ? conf.size (row [cnf], row) : conf.size ) : 25 ),
									x = (conf.x ? (typeof conf.x === "function" ? conf.x (row [cnf], row) : conf.x ) : 0 ),
									y = (conf.y ? (typeof conf.y === "function" ? conf.y (row [cnf], row) : conf.y ) : 0 )

								var lines = text.split ("\n");
								if (conf.multiline) { 
								
								for (var l in lines) { 
									var txt = lines [l].trim (), words = txt.split (' '), max_words = 6;
									var groups = words.map ( (e, i) => { return i % max_words === 0 ? words.slice (i, i + max_words) : null }).filter ((e) => {return e;}) 

									for (var g in groups ) {
										img.stringFT (colors [color], fonts [font], size, 0, x, y, groups [g].join (' ') );
										y += size + (size * .25);
									}
								}
								} else { 
									img.stringFT (colors [color], fonts [font], size, 0, x, y, text);
								}
							}

							img.savePng ('./output.' + r + "." + year + month + day + hour + minute + ".png", 1, function (err) {
								if (err) {
									console.log ("Could not save image; " + err);
									throw err;
								}
								console.log ("saved!");
							});
						}
					} catch (e) {
						console.log ("error: " + e)
					}
				})
			} else {
				console.log ("404: " + imgFile);
			}
		}
	}
])

