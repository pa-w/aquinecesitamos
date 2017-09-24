var GoogleSpreadsheet = require('google-spreadsheet');
var gd = require ('node-gd');
var fs = require ('fs');
var async = require('async');
var sheed_id = '1mo9czjIQupWSkjyM--_RSusShy-WbHi8w28oBmxeufk';
var doc = new GoogleSpreadsheet (sheet_id)
var sheet, matrix = {}, savedRows = [];
var min_row = 5, max_row = 50, outputFile = './ouput/latest.json';


/* config */
var gSpreadsheetID = process.env.GSPREADSHEET_ID || '1mo9czjIQupWSkjyM--_RSusShy-WbHi8w28oBmxeufk';
var gAPIKeyFile = process.env.GAPI_KEY_FILE || './gdrive.key.json';

if (!fs.existsSync(gAPIKeyFile)) {
	console.error(`GDrive API Key file not found (${gAPIKeyFile}). Aborting.`);
	process.exit(1);
}

var gAPIKey = require (gAPIKeyFile);

var doc = new GoogleSpreadsheet (gSpreadsheetID);
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
	actualizacion: { size: 70, x: 1550, y: 140, text: (a, r) => {[date, time] = a.split (' '); [year, day, month] = date.split('/'); return day + "." + month + " | " + time; }, color: (a, r) => { return r.alerta.toLowerCase(); } }
};

function getTemplate (row) { 
	//PNG de base, en este caso tenemos templates distintos para cada nivel de alerta
	return './assets/alerta_' + row.alerta + '.png';
}
function getFilePath (row) { 
	//Devuelve el nombre de archivo para guardar
	[date, time] = row.actualizacion.split (' ');
	[year,day,month] = date.split('/'), [hour,minute] = time.split(':');
	if (date && time) {
		return './output/'+ row.zona.toLowerCase ().replace(/ /g, '') + "-" + row.alerta.toLowerCase () + "-"  + year + month + day + hour + minute + ".png";
	}
	return './output/'+row.zona.toLowerCase().replace(/ /g, '') + "-" + row.zona.toLowerCase () + ".png";
}
function savedRow (row) {
	savedRows.push (row);
}

async.series ([
	function setAuth (step) {
		doc.useServiceAccountAuth (gAPIKey, step);
		return step;
	},
	function getInfoAndWorksheets (step) {
		doc.getInfo((error, info) => { 
			sheet = info.worksheets [0];	
			step ();
		})
		
	},
	function workingWithCells (step) {
		sheet.getCells ({
			'min-row': min_row,
			'max-row': max_row
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

						var filePath = getFilePath (row);
						row.file_path = filePath;
						savedRow (row);

						img.savePng (filePath, 1, function (err) {
							if (err) {
								console.log ("Could not save image; " + err);
								return;
							}
						});
					} catch (e) {
						console.log ("error: " + e)
						console.log (e.stack);
					}
				});
			} else {
				console.log ("404: template file " + imgFile);
			}
		}
		step ();
	},
	function ProduceOutput () {
		var json = JSON.stringify (savedRows);
		fs.writeFile (outputFile, json, 'utf8', () => {});
	}
])

