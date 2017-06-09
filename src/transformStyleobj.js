var vm = require('vm');
var t = require('babel-types');
var generate = require('babel-generator').default;


module.exports = function(objectExpressionPath, context, filename){
	let objectExpression = objectExpressionPath.node
	if(!t.isObjectExpression(objectExpression)){
		throw objectExpression.buildCodeFrameError('StyleSheet.create arguments must be an object.');
		return;
	}

	context = vm.createContext(Object.assign({}, context));
	context.eval = function(node){
		return vm.runInContext(generate(node).code, this);
	}

	const result ={};

	objectExpressionPath.get('properties').forEach( property => {
		let id = filename + '__' + property.node.key.name, value = property.get('value');
		result[id] = {};
		if(t.isObjectExpression(value.node)){
			processProperties(value.get('properties'), result[id], context, filename) && property.remove(); 
		} else if(t.isCallExpression(value.node) && t.isMemberExpression(value.node.callee) 
			&& t.isNewExpression(value.node.callee.object) && 'PlatformStyle' === value.node.callee.object.callee.name){//new PlatformStyle(params) 平台差异style
			
			let properties = getPlatformStyle(value.node.callee.object.arguments[0], value);
			
			value.replaceWith(t.ObjectExpression(properties));
			processProperties(value.get('properties'), result[id], context, filename) && property.remove();
		}
		
	})

	return result; 
}

function getPlatformStyle(objectExpression, node){
	if(!t.isObjectExpression(objectExpression)){
		return;
	}

	let properties = [], common = [], web =[];
	objectExpression.properties.forEach( property => {
		if('common' === property.key.name){
			common = property.value.properties || [];
		}
		if('web' === property.key.name){
			web = property.value.properties || [];
		}
	});

	let index;
	web.forEach( property => {
		if((index = checkInArry(common, property)) != -1){
			common.push(property);
		}else{
			common[index] = property;
		}
	})

	return common;
}

function processProperties(properties, result, context, filename){
	let allCanEval = true;

	properties.forEach(property => {
		let name = property.node.key.name, value = property.node.value;
		if(canEval(value, context)){
			const val = context.eval(value);
			result[name] = val;
			property.remove();		
		} else if (t.isUnaryExpression(value) && value.prefix === true && value.operator === '-') {
			if(t.isLiteral(value.argument)){
				result[name] = -value.argument.value;
			}
			property.remove();
  		} else if(t.isArrayExpression(value) && name === 'transform'){
  			let elements = value.elements, str = [], allLiteral = true;

  			elements.forEach( objexp => {
  				if(t.isObjectExpression(objexp) && t.isLiteral(objexp.properties[0].value)){
  					let property = objexp.properties[0];
  					str.push((property.key.name || property.key.value) + '('+ property.value.value +')');
  				} else {
  					allCanEval = false;
  					allLiteral = false;
  				}
  			})

  			if(allLiteral){
  				result[name] = str.join(' ');
  				property.remove();
  			}
  		} else {
  			allCanEval = false;
  		}
	})

	return allCanEval;
}

function canEval(expr, context){
  if (t.isLiteral(expr)) {
    return true;
  } else if (t.isIdentifier(expr) && context.hasOwnProperty(expr.name)) {
    return true;
  } else if (t.isMemberExpression(expr)) {
    return t.isIdentifier(expr.property) && canEval(expr.object, context);
  } else if(t.isUnaryExpression(expr)){
  	return true;
  } else if (t.isBinaryExpression(expr)) {
    return canEval(expr.left, context) && canEval(expr.right, context);
  }

  return false;
}

function checkInArry(arry, item){
	let keyname = item.key.name || item.key.value;
	for(let i = 0; i < arry.length; i++){
		if(keyname === (arry[i].key.name || arry[i].key.value)){
			return i;
		}
	}
	return -1;
}