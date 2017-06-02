var vm = require('vm');
var t = require('babel-types');
var generate = require('babel-generator').default;

module.exports = exports = function transfromStyleObj(objectExpression, context, filename){
	if(!t.isObjectExpression(objectExpression)){
		throw objectExpression.buildCodeFrameError('StyleSheet.create arguments must be object.');
		return;
	}

	context = vm.createContext(Object.assign({}, context));
	context.eval = function(node){
		return vm.runInContext(generate(node).code, this);
	}

	const result ={};

	objectExpression.properties.forEach( property => {
		let id = filename + '_' + property.key.name;
		result[id] = {};
		processProperties(property.value.properties, result[id], context, filename); 
	})

	return result; 
}

function processProperties(properties, result, context, filename){
	properties.forEach(property => {
		let name = property.key.name, value = property.value;
		if(canEval(value, context)){
			const val = context.eval(value);
			result[name] = val;		
		} else if (t.isUnaryExpression(value) && value.prefix === true && value.operator === '-') {
			if(t.isLiteral(value.argument)){
				result[name] = -value.argument.value;
			}
  		} else if(t.isArrayExpression(value) && name === 'transform'){
  			let elements = value.elements, str = [], allLiteral = true;
  			elements.forEach( objexp => {
  				if(t.isObjectExpression(JSON.stringify(objexp)) && t.isLiteral(objexp.properties[0].value)){
  					let property = objexp.properties[0];
  					str.push(property.key.name + '('+ property.value.value +')');
  				} else {
  					allLiteral = false;
  				}
  			})
  			if(allLiteral){
  				result[name] = str.join(' ');
  				//TODO replace AST
  			}
  		}
	})
}

function canEval(expr, context){
  if (t.isLiteral(expr)) {
    return true;
  } else if (t.isIdentifier(expr) && context.hasOwnProperty(expr.name)) {
    return true;
  } else if (t.isMemberExpression(expr)) {
    return t.isIdentifier(expr.property) && canEval(expr.object, context);
  } else if (t.isBinaryExpression(expr)) {
    return canEval(expr.left, context) && canEval(expr.right, context);
  }

  return false;
}