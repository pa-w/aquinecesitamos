var aig = require ('array_image_generator');
var fs = require ('fs');
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var sheet_id = '1mo9czjIQupWSkjyM--_RSusShy-WbHi8w28oBmxeufk';
var gAPIKey = require (__dirname + '/gdrive.key.json');
var outputFile = __dirname + "/output/latest.json";

var doc = new GoogleSpreadsheet (sheet_id)
var sheet, matrix = {};

var img = new aig ();
img.fileName ((row) => { 
	[date, time] = row.actualizacion.split (' ');
	[year,day,month] = date.split('/'), [hour,minute] = time.split(':');
	if (date && time) {
		return __dirname + '/output/'+ row.zona.toLowerCase ().replace(/ /g, '') + "-" + row.alerta.toLowerCase () + "-"  + year + month + day + hour + minute + ".png";
	}
	return __dirname + '/output/'+row.zona.toLowerCase().replace(/ /g, '') + "-" + row.zona.toLowerCase () + ".png";
} )
img.template ((row) => { console.log (row.alerta); return __dirname + "/assets/alerta_" + row.alerta.toLowerCase () + '.png'; })
img.addFont ('regular', __dirname + '/assets/font-regular.ttf');
img.addFont ('bold', __dirname + '/assets/font-bold.ttf');

img.addColor ('white', {r: 255, g: 255, b: 255});
img.addColor ('bajo', {r: 209, g: 139, b: 36});
img.addColor ('medio', {r: 226, g: 111, b: 71});
img.addColor ('alto', {r: 221, g: 62, b: 62}); 
img.addColor ('urgente', {r: 221, g: 62, b: 62}); 

//img.text ('alerta', {font: 'bold', size: 100, x: 50, y: 200, color: 'white', text: (a, r) => { return a.toUpperCase (); } });
img.text ('zona', {font: 'bold', size: (a, r) => { if (!a) return 55; return a.length > 20 ? 45 : 55 }, x: 20, y: 120, color: 'white', text: (a, r) => { if (!a) return ''; return a.toUpperCase (); } });
img.text ('direccion', { size: (a, r) => { if (!a) { return 20; } return a.length > 30 ? 17 : 20 }, x: 65, y: 170});
img.text ('detalle', { size: 20, x: 65, y: 215 });
img.text ('requeridos', {size: 14, x: 20, y: 330, text: (a, r) => { if (r.brigadistas && r.brigadistas[0] == 's') { a = "Se necesitan brigadistas." + a; }  a = a.replace (/\./g, ',');  return a.replace (/,/g, "\n")}, multiline: true });
img.text ('admitidos', { size: 14, x: 470, y: 330, text: (a, r) => { if (!a) return ''; a = a.replace (/\./g, ','); return a.replace(/,/g, "\n") }, multiline: true });
img.text ('no_requeridos', { size: 20, x: 20, y: 750, text: (a, r) => { if (r.brigadistas && r.brigadistas[0] == 'n') { a = "No se necesitan brigadistas." + (a ? a : ''); } if (!a) return ''; a = a.replace (/\./g, ','); return a.replace(/,/g, "\n") }, multiline: true });
img.text ('actualizacion', { size: 33, x: 550, y: 175, text: (a, r) => {[date, time] = a.split (' '); [year, day, month] = date.split('/'); return " " + day + "." + month + "          " + time; }, color: 'white' });

var translate = {"1": "alerta", "2": "brigadistas", "3": "requeridos", "4": "admitidos", "5": "no_requeridos", "6": "direccion", "7": "zona", "8": "detalle", "9": "actualizacion"};
var min_row = 5, max_row = 50;

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
		img.data (matrix);
		img.render (step);
	},
	function SaveJSON (step) {
		var ll = [];
		for (var r in img._rows) {
			var x = img._rows [r];
			x.file_name = x.file_path.split('\\').pop().split('/').pop()
			x.file_path = '';
			ll.push (x);
		}
		var json = JSON.stringify (ll);
		fs.writeFile (outputFile, json, 'utf8', step);
	}
]);
