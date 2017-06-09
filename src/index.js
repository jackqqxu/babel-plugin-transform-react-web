var MODULE_MAP = require('./constants');
var Path = require('path');
var transfromStyleobj = require('./transformStyleobj'); 
var transformToCss = require('./transformToCss');
var postCss = require('postcss');
var autoPreFixer = require('autoprefixer');
var fs = require('fs');

var transformCss = true;
module.exports = function({types: t}){
	var status = {
		cache:{},
		traversal:{},
		sheetids:{} //filename + identifier
	}
	var filesystem, filepath;//dev环境文件写内存不写盘 

	return {
		visitor: {
			Program:{
				enter(path, state){
					var filename = this.file.opts.filename.split('/').slice(-2).join('__').replace('.js', '').replace('.', '-');//上级目录名+文件名
					this.cssObj = {filename, css:'', context: getContext()};
					this.importIdentifers = {}; //从其他文件引入styles
					status.traversal[filename] = true;
				},
				exit(path, state){
					if(!status.traversal[this.cssObj.filename]){
						return;
					}

					!filepath && (filepath = this.opts.file);

					if(!filepath){
						return;
					}

					status.cache[this.cssObj.filename] = this.cssObj.css;
					let output = [], dir = filepath.substring(0, filepath.lastIndexOf('\\'));
					for(let key in status.cache){
						output.push(status.cache[key]);
					}

					if(!this.opts.outputdata){
						if(!fs.existsSync(dir)){
							mkdirs(dir, filesystem);
						}
						filesystem.writeFileSync(filepath, output, 'utf8')
					} else {
						
						global.__RNWEBCSS__ = output.join('');//通信优化
					}


				}
			},
			ImportDeclaration(path, state){
				let source, specifiers, importNodes = [], tmpNode;

				source = path.node.source;
				specifiers = path.node.specifiers;

				if(source.value === 'react-native'){
					let moduleSource;	
					specifiers.map((item, index) => {
						moduleSource = MODULE_MAP[item.imported.name];
						tmpNode = t.importDeclaration([t.importDefaultSpecifier(t.identifier(item.local.name))], 
							t.stringLiteral(moduleSource.startsWith('/') ? source.value + moduleSource : moduleSource));
						importNodes.push(tmpNode);
					})

					path.replaceWithMultiple(importNodes);			
				} else {
					let filename, sourceValue = source.value, paths;
					specifiers.forEach( item => {
						if(sourceValue.indexOf('/') != -1){
							paths = sourceValue.split('/');
							if(paths.length == 2 && path[0] == '.'){
								filename = this.cssObj.filename.split('__')[0] + '__' + paths[1].replace('.', '-');
							} else {
								filename = paths.slice(-2).join('__');
							}
							this.importIdentifers[item.name] = filename;
						}
					})
					
				}
			},
			JSXAttribute(path, state){
				let identifier = path.node.name, value = path.node.value;
				if(identifier.name != 'style' || !t.isJSXExpressionContainer(value)){
					return;
				}

				let expresion = value.expresion,
					classArry = [];

				getClass.aplly(this, [t, expresion, classArry]);

				if(t.isArrayExpression(expresion)){
					let elements = expresion.elements;
					elements.forEach( item => {
						getClass.aplly(this, [t, item, classArry]);
					})
				}

			},			
			CallExpression(path, state){
				const callee = path.node.callee;
				if(transformCss && t.isMemberExpression(callee) 
					&& t.isIdentifier(callee.object, {name: 'StyleSheet'}) 
					&& t.isIdentifier(callee.property, {name: 'create'})
					&& t.isVariableDeclarator(path.parentPath.node)){//StyleSheet.create创建的样式表
					const styleobj =  transfromStyleobj(path.get('arguments')[0], this.cssObj.context, this.cssObj.filename);
					
					this.cssObj.css = transformToCss(styleobj);
					this.cssObj.css = postCss([autoPreFixer({browsers:['IOS >= 7', 'Android >= 2.3']})]).process(this.cssObj.css).css;
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

function getClass(t, expresion, arry){
	if(t.isMemberExpression(expresion)){
		let memberIdentifier = expresion.object.name,
			memberValue = expresion.property.name || expresion.property.value;
			
		if(this.importIdentifers[memberIdentifier]){
			arry.push(this.importIdentifers[memberIdentifier] + '__' + memberValue);
		} else {
			arry.push(this.cssObj.filename + '__' + memberValue);
		}
	}
}

function mkdirs(dir, fs){
	if(fs.existsSync(dir)){
		return;
	} else {
		mkdirs(dir.substring(0, dir.lastIndexOf('\\')), fs);
		fs.mkdirSync(dir.substring(0, dir.lastIndexOf('\\')));
	}
}
