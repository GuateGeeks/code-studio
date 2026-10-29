// Trusted AST reader, executed in Pyodide on the language origin. Learner text
// is parsed as data only: no compile/eval/exec of the submitted program.
export const pythonCodeViewReader = String.raw`
import ast, json, tokenize, io
def _cv_python_read(source, vocabulary_json):
    vocab = json.loads(vocabulary_json)
    lines, mapping = [], []
    def fail(message, node):
        raise SyntaxError(message, ("program.py", getattr(node,"lineno",1), getattr(node,"col_offset",0)+1, ""))
    def emit(text,node):
        lines.append(text); mapping.append({"line":getattr(node,"lineno",1),"column":getattr(node,"col_offset",0)+1,
          "endLine":getattr(node,"end_lineno",getattr(node,"lineno",1)),"endColumn":getattr(node,"end_col_offset",0)+1})
    def dotted(node):
        if isinstance(node,ast.Name): return node.id
        if isinstance(node,ast.Attribute) and isinstance(node.value,ast.Name): return node.value.id+"."+node.attr
        fail("Usa un nombre de la API instalada.",node)
    def expr(node):
        if isinstance(node,ast.Constant) and type(node.value) in (int,float,str): return json.dumps(node.value,ensure_ascii=True)
        if isinstance(node,ast.Name): return node.id
        if isinstance(node,ast.UnaryOp) and isinstance(node.op,ast.USub): return "-"+expr(node.operand)
        if isinstance(node,ast.Call):
            name=dotted(node.func)
            if name!="shared": fail("Este valor necesita un número o una variable del programa.",node)
            if len(node.args)!=1 or node.keywords: fail("shared recibe un valor inicial.",node)
            return "shared("+expr(node.args[0])+")"
        fail("Esta expresión no tiene bloque instalado.",node)
    structures=set(vocab.get("$structures",[]))
    def compare(test):
        if not isinstance(test,ast.Compare) or len(test.ops)!=1 or len(test.comparators)!=1 or type(test.ops[0]) not in (ast.Eq,ast.Lt,ast.Gt):
            fail("La comparación bloqueable usa ==, < o >.",test)
        return expr(test.left)+" "+{ast.Eq:"==",ast.Lt:"<",ast.Gt:">"}[type(test.ops[0])]+" "+expr(test.comparators[0])
    tree=ast.parse(source,"program.py")
    variables={node.targets[0].id for node in tree.body if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name)}
    def statement(node,depth):
        if depth>8: fail("El programa supera la profundidad de bloques permitida.",node)
        if isinstance(node,ast.Pass): return
        if isinstance(node,ast.Global):
            if any(name not in variables for name in node.names): fail("global solo declara variables numéricas del programa.",node)
            return
        if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and "waitUntil" in structures and isinstance(node.value.func,ast.Name) and node.value.func.id=="wait_until":
            call=node.value
            if len(call.args)!=1 or call.keywords or not isinstance(call.args[0],ast.Lambda) or call.args[0].args.args or call.args[0].args.vararg or call.args[0].args.kwarg or call.args[0].args.kwonlyargs or call.args[0].args.posonlyargs:
                fail("Esperar hasta se escribe wait_until(lambda: a > b), con una comparación ==, < o >.",call)
            emit("waitUntil(() => "+compare(call.args[0].body)+");",node);return
        if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call):
            call=node.value;name=dotted(call.func);definition=vocab.get(name)
            if not definition or definition["kind"]!="call": fail("La llamada «"+name+"» no tiene bloque instalado en esta posición.",node)
            if call.keywords: fail("Usa argumentos por posición en esta llamada.",call)
            emit(definition["js"]+"("+", ".join(expr(arg) for arg in call.args)+");",node);return
        if isinstance(node,ast.Assign):
            if len(node.targets)!=1 or not isinstance(node.targets[0],ast.Name): fail("Asigna una sola variable numérica.",node)
            emit(node.targets[0].id+" = "+expr(node.value)+";",node);return
        if isinstance(node,ast.AugAssign) and isinstance(node.target,ast.Name) and isinstance(node.op,(ast.Add,ast.Sub)):
            emit(node.target.id+(" += " if isinstance(node.op,ast.Add) else " -= ")+expr(node.value)+";",node);return
        if isinstance(node,ast.For):
            call=node.iter
            if not isinstance(node.target,ast.Name) or not isinstance(call,ast.Call) or dotted(call.func)!="range" or len(call.args)!=1 or call.keywords or node.orelse:
                fail("La repetición bloqueable usa for i in range(cantidad).",node)
            counter=node.target.id
            emit("for (let "+counter+" = 0; "+counter+" < "+expr(call.args[0])+"; "+counter+"++) {",node)
            for child in node.body: statement(child,depth+1)
            emit("}",node);return
        if isinstance(node,ast.If):
            test=node.test
            if not isinstance(test,ast.Compare) or len(test.ops)!=1 or len(test.comparators)!=1 or type(test.ops[0]) not in (ast.Eq,ast.Lt,ast.Gt):
                fail("La comparación bloqueable usa ==, < o >.",test)
            op={ast.Eq:"==",ast.Lt:"<",ast.Gt:">"}[type(test.ops[0])]
            emit("if ("+expr(test.left)+" "+op+" "+expr(test.comparators[0])+") {",node)
            for child in node.body: statement(child,depth+1)
            if node.orelse:
                emit("} else {",node)
                for child in node.orelse: statement(child,depth+1)
            emit("}",node);return
        if isinstance(node,ast.While) and structures&{"forever","repeatUntil"}:
            test=node.test
            if node.orelse: fail("El bucle while bloqueable no lleva else.",node)
            if "forever" in structures and isinstance(test,ast.Constant) and test.value is True:
                emit("while (true) {",node)
            elif "repeatUntil" in structures and isinstance(test,ast.UnaryOp) and isinstance(test.op,ast.Not):
                emit("while (!("+compare(test.operand)+")) {",node)
            else: fail("Solo dos bucles while tienen bloque: while True: (por siempre) y while not (a > b): (repetir hasta que).",node)
            for child in node.body: statement(child,depth+1)
            emit("}",node);return
        if isinstance(node,ast.Return) and "stopScript" in structures:
            if node.value is not None: fail("Detener este programa se escribe return, sin valor.",node)
            emit("return;",node);return
        if isinstance(node,ast.While): fail("Este bucle no tiene bloque 2D instalado; usa for i in range(cantidad) o conserva una copia independiente.",node)
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)): fail("Las funciones propias no tienen bloque 2D instalado; conserva una copia independiente.",node)
        fail("La construcción «"+type(node).__name__+"» no tiene bloque 2D instalado.",node)
    handlers=set()
    for node in tree.body:
        if isinstance(node,ast.Assign):
            if len(node.targets)!=1 or not isinstance(node.targets[0],ast.Name): fail("Declara una sola variable numérica.",node)
            emit("let "+node.targets[0].id+" = "+expr(node.value)+";",node);continue
        if isinstance(node,ast.FunctionDef):
            args=node.args
            if len(node.decorator_list)!=1 or args.posonlyargs or args.args or args.kwonlyargs or args.vararg or args.kwarg or args.defaults or args.kw_defaults or node.returns:
                fail("El evento necesita una función sin parámetros y un único decorador instalado.",node)
            if node.name in handlers or node.name in variables: fail("Usa un nombre distinto para cada función de evento.",node)
            handlers.add(node.name)
            decorator=node.decorator_list[0]
            call=isinstance(decorator,ast.Call)
            name=dotted(decorator.func if call else decorator);definition=vocab.get(name)
            if not definition or definition["kind"]!="event": fail("Las funciones propias necesitan un evento instalado; conserva una copia independiente.",node)
            if call and decorator.keywords: fail("El evento usa argumentos por posición.",decorator)
            args=decorator.args if call else []
            expected=1 if definition["option"] else 0
            if len(args)!=expected or call and not expected: fail("Conserva los argumentos del decorador del evento.",decorator)
            emit(definition["js"]+"("+(", ".join(expr(arg) for arg in args)+", " if args else "")+"() => {",decorator)
            for child in node.body: statement(child,1)
            emit("});",node);continue
        fail("Coloca las instrucciones dentro de un evento instalado.",node)
    comments=[]
    for token in tokenize.generate_tokens(io.StringIO(source).readline):
        if token.type==tokenize.COMMENT:
            text=token.string[1:].strip()
            if text=="Python de tus bloques. Crear una copia no cambia tus bloques.": continue
            comments.append({"text":text,"line":token.start[0],"column":token.start[1]+1,"endLine":token.end[0],"endColumn":token.end[1]+1})
    if len(comments)>300: fail("El texto supera el límite de 300 comentarios.",tree)
    return json.dumps({"source":"\n".join(lines),"mapping":mapping,"comments":comments})
def _cv_python_safe(source, vocabulary_json):
    try: return _cv_python_read(source,vocabulary_json)
    except SyntaxError as error:
        return json.dumps({"error":{"message":error.msg,"lineNumber":error.lineno or 1,"columnNumber":error.offset or 1,
          "code":"CV_SYNTAX" if "invalid syntax" in error.msg or "expected" in error.msg or "never closed" in error.msg else "CV_UNSUPPORTED"}})
`;

export async function parsePythonCodeView(source,options,{parseJavaScriptCodeView,pythonCodeViewVocabulary}) {
  const {loadPyodide}=await import('/vendor/pyodide/pyodide.mjs');
  const runtime=await loadPyodide({indexURL:'/vendor/pyodide/',packageBaseUrl:'/vendor/pyodide/',jsglobals:Object.freeze({}),packages:[]});
  runtime.setStdin({error:true});
  runtime.runPython(pythonCodeViewReader);
  const reader=runtime.globals.get('_cv_python_safe');
  let translated;
  try{
    translated=JSON.parse(reader(source,JSON.stringify(pythonCodeViewVocabulary(options))));
  }catch(error){
    const match=String(error.message).match(/line (\d+)/g)?.at(-1)?.match(/\d+/);
    throw Object.assign(new Error(String(error.message).split('\n').filter(Boolean).at(-1)),{
      code:'CV_SYNTAX',lineNumber:match?Number(match[0]):1,columnNumber:1});
  }finally{reader.destroy();}
  if(translated.error)throw Object.assign(new Error(translated.error.message),translated.error);
  const mapped=location=>translated.mapping[Math.max(0,Math.min(translated.mapping.length-1,location.line-1))]??{line:1,column:1,endLine:1,endColumn:1};
  let parsed;
  try{parsed=parseJavaScriptCodeView(translated.source,options);}
  catch(error){throw Object.assign(error,{lineNumber:mapped({line:error.lineNumber??1}).line,columnNumber:1});}
  return {...parsed,sourceLocations:parsed.sourceLocations.map(item=>({sourceBlockId:item.sourceBlockId,...mapped(item)})),comments:translated.comments};
}
