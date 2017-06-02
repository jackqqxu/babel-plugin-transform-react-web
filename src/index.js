var MODULE_MAP = require('./constants');
var Path = require('path');
var transfromStyleObj = require('./transformStyleObj'); 
var transformToCss = require('./transformToCss');

var transformCss = false;
module.exports = function({types: t}){
	var status = {
		cache:{},
		traversal:{}
	}

	return {
		visitor: {
			Program:{
				enter(path, file){
					var filename = Path.relative(process.cwd(), this.file.opts.filename);
					this.cssObj = {filename, stylesheets:{}, context: getContext()};
					status.traversal[filename] = true;
				},
				exit(path, file){

				}
			},
			ImportDeclaration(path, state){
				let source, specifiers, importNodes = [], tmpNode;

				source = path.node.source;
				specifiers = path.node.specifiers;

				if(source.value === 'react-native'){	
					specifiers.map((item, index) => {
						tmpNode = t.importDeclaration([t.importDefaultSpecifier(t.identifier(item.local.name))], 
							t.stringLiteral(source.value + MODULE_MAP[item.imported.name]));
						importNodes.push(tmpNode);
					})

					path.replaceWithMultiple(importNodes);			
				}
			},
			JSXElement(path, state){
				
			},			
			CallExpression(path, state){
				const callee = path.node.callee, inputObjExpression = path.node.arguments[0];
				if(transformCss && t.isMemberExpression(callee) 
					&& t.isIdentifier(callee.object, {name: 'StyleSheet'}) 
					&& t.isIdentifier(callee.property, {name: 'create'})
					&& t.isVariableDeclarator(path.parentPath.node)){//StyleSheet.create创建的样式表
					const styleobj =  transfromStyleObj(inputObjExpression, this.cssObj.context, this.cssObj.filename);
					console.log(styleobj);
					const sheet = transformToCss(styleobj);
				}
			}
		},
		post(state){
		}
	}
}

function getContext(){
	return {};
}

