import {scene2DApi3} from './api-v3-vocabulary.mjs';

// Python half of the API v3 translator (see api-v3.mjs). It runs inside the
// Pyodide worker: the student's AST is rewritten to the API1 form and the
// transformed tree is compiled directly, so line numbers are preserved.
const vocabulary = JSON.stringify({
  statements: Object.fromEntries(Object.values(scene2DApi3.statements).map(item => [item.python, item])),
  events: Object.fromEntries(Object.values(scene2DApi3.events).map(item => [item.python, item])),
  shared: scene2DApi3.shared
});

export const api3PythonCompiler = String.raw`
import ast as _gg_ast, json as _gg_json
_GG_VOCABULARY = _gg_json.loads(${JSON.stringify(vocabulary)})
_GG_COMPARE = {_gg_ast.Eq: "EQ", _gg_ast.Lt: "LT", _gg_ast.Gt: "GT"}
_GG_RESERVED = {"GG", "ctx", "hero", "shared", "wait", "on_start", "on_key", "on_message"}

def _gg_api3_compile(source, variable_ids_json):
    ast = _gg_ast
    variable_ids = _gg_json.loads(variable_ids_json)
    statements, events = _GG_VOCABULARY["statements"], _GG_VOCABULARY["events"]
    lines = source.splitlines()
    def fail(message, node):
        line = getattr(node, "lineno", 1)
        raise SyntaxError(message, ("document.py", line, getattr(node, "col_offset", 0) + 1, lines[line - 1] if 0 < line <= len(lines) else ""))
    def dotted(node):
        if isinstance(node, ast.Name): return node.id
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name): return node.value.id + "." + node.attr
        return None
    def number(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float): return node.value
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant) and type(node.operand.value) in (int, float): return -node.operand.value
        return None
    def at(new, old):
        return ast.fix_missing_locations(ast.copy_location(new, old))
    def attr(*path):
        node = ast.Name(id=path[0], ctx=ast.Load())
        for part in path[1:]: node = ast.Attribute(value=node, attr=part, ctx=ast.Load())
        return node
    variables, body = {}, []
    for statement in source and ast.parse(source, "document.py", "exec").body or []:
        if isinstance(statement, ast.Assign) and len(statement.targets) == 1 and isinstance(statement.targets[0], ast.Name):
            value, scope = statement.value, "local"
            if isinstance(value, ast.Call) and dotted(value.func) == _GG_VOCABULARY["shared"]:
                if len(value.args) != 1 or value.keywords: fail("shared() recibe un valor inicial.", value)
                value, scope = value.args[0], "global"
            initial = number(value)
            if initial is not None:
                name = statement.targets[0].id
                if name in _GG_RESERVED: fail("«" + name + "» está reservado en Code Studio; elige otro nombre.", statement)
                variables[name] = {"id": variable_ids.get(name, name), "name": name, "scope": scope, "initialValue": initial}
                continue
            if scope == "global": fail("El valor inicial de una variable del programa debe ser un número.", statement)
        body.append(statement)
    external = set()
    for name, identifier in variable_ids.items():
        if name not in variables:
            variables[name] = {"id": identifier}
            external.add(name)
    def is_variable(node): return isinstance(node, ast.Name) and node.id in variables
    def ref(node): return at(ast.Call(func=attr("GG", "ref"), args=[ast.Constant(variables[node.id]["id"])], keywords=[]), node)
    def has_action(node):
        for child in ast.walk(node):
            if isinstance(child, ast.Call) and (dotted(child.func) in statements or dotted(child.func) in events): return child
        return None
    def check(node, allowed=()):
        for child in ast.walk(node):
            if child in allowed: continue
            if isinstance(child, ast.Name) and child.id in variables and isinstance(child.ctx, ast.Load): fail("Usa " + child.id + " directamente en una acción, en una asignación o en una comparación ==, < o >.", child)
            if isinstance(child, ast.Call) and dotted(child.func) in statements: fail(dotted(child.func) + " se usa como instrucción propia, no dentro de una expresión.", child)
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
                action = has_action(child)
                if action is not None: fail("Las acciones del programa van directamente dentro de un evento, no dentro de funciones propias.", action)
    def argument(node):
        if is_variable(node): return ref(node)
        check(node)
        return node
    def handler_body(items):
        out = []
        for node in items:
            if isinstance(node, ast.Global):
                rest = [name for name in node.names if name not in variables]
                if rest: out.append(at(ast.Global(names=rest), node))
                continue
            if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and dotted(node.value.func) in statements:
                call, action = node.value, statements[dotted(node.value.func)]
                if len(call.args) != action["arity"] or call.keywords: fail(dotted(call.func) + " recibe " + str(action["arity"]) + (" valor." if action["arity"] == 1 else " valores."), call)
                if action.get("stops"):
                    out.append(at(ast.If(test=ast.Await(value=ast.Call(func=attr("ctx", "deleteClone"), args=[], keywords=[])), body=[ast.Return(value=None)], orelse=[]), node))
                    continue
                args = [argument(item) for item in call.args] + ([ast.Constant(action["append"])] if "append" in action else [])
                out.append(at(ast.Expr(value=ast.Await(value=ast.Call(func=attr("ctx", action["ctx"]), args=args, keywords=[]))), node))
                continue
            if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Attribute) and dotted(node.value.func) and dotted(node.value.func).startswith("hero."):
                fail("hero no tiene la acción " + node.value.func.attr + ".", node)
            if isinstance(node, ast.Assign) and len(node.targets) == 1 and is_variable(node.targets[0]):
                out.append(at(ast.Expr(value=ast.Await(value=ast.Call(func=attr("ctx", "setVariable"), args=[ast.Constant(variables[node.targets[0].id]["id"]), argument(node.value)], keywords=[]))), node))
                continue
            if isinstance(node, ast.AugAssign) and is_variable(node.target):
                if not isinstance(node.op, (ast.Add, ast.Sub)): fail("Usa =, += o -= con " + node.target.id + ".", node)
                value = argument(node.value)
                if isinstance(node.op, ast.Sub): value = at(ast.UnaryOp(op=ast.USub(), operand=value), node.value)
                out.append(at(ast.Expr(value=ast.Await(value=ast.Call(func=attr("ctx", "changeVariable"), args=[ast.Constant(variables[node.target.id]["id"]), value], keywords=[]))), node))
                continue
            if isinstance(node, ast.If):
                test = node.test
                if isinstance(test, ast.Compare) and len(test.ops) == 1 and type(test.ops[0]) in _GG_COMPARE and (is_variable(test.left) or is_variable(test.comparators[0])):
                    node.test = at(ast.Await(value=ast.Call(func=attr("ctx", "compare"), args=[ast.Constant(_GG_COMPARE[type(test.ops[0])]), argument(test.left), argument(test.comparators[0])], keywords=[])), test)
                else: check(test)
                node.body, node.orelse = handler_body(node.body), handler_body(node.orelse)
                out.append(node); continue
            if isinstance(node, (ast.For, ast.While)):
                for part in (getattr(node, "iter", None), getattr(node, "test", None), getattr(node, "target", None)):
                    if part is not None: check(part)
                node.body, node.orelse = handler_body(node.body), handler_body(node.orelse)
                out.append(node); continue
            check(node)
            out.append(node)
        return out or [ast.Pass()]
    module, registered = [], 0
    for statement in body:
        event = None
        if isinstance(statement, ast.FunctionDef) and len(statement.decorator_list) == 1:
            decorator = statement.decorator_list[0]
            key = dotted(decorator.func if isinstance(decorator, ast.Call) else decorator)
            event = events.get(key)
        if event is None:
            action = has_action(statement)
            if action is not None: fail("Las acciones del programa van dentro de un evento, como @on_start.", action)
            check(statement)
            module.append(statement); continue
        decorator = statement.decorator_list[0]
        options = decorator.args if isinstance(decorator, ast.Call) else []
        if event.get("option") and not (len(options) == 1 and isinstance(options[0], ast.Constant) and isinstance(options[0].value, str)): fail("@" + key + " recibe un texto entre comillas.", decorator)
        if not event.get("option") and options: fail("@" + key + " no recibe valores.", decorator)
        if statement.args.args or statement.args.posonlyargs or statement.args.kwonlyargs or statement.args.vararg or statement.args.kwarg: fail("La función del evento no recibe parámetros.", statement)
        handler = at(ast.AsyncFunctionDef(name=statement.name, args=ast.arguments(posonlyargs=[], args=[ast.arg(arg="ctx")], kwonlyargs=[], kw_defaults=[], defaults=[]), body=handler_body(statement.body), decorator_list=[], returns=None, type_params=[]), statement)
        target = [ast.Constant(event["target"])] if event.get("target") else []
        register = at(ast.Expr(value=ast.Call(func=attr("GG", "events", event["register"]), args=list(options) + target + [ast.Name(id=statement.name, ctx=ast.Load())], keywords=[])), statement)
        module += [handler, register]
        registered += 1
    if not registered and len(variables) == len(external):
        return compile(source, "document.py", "exec", flags=_gg_ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True), False
    configured = [item for name, item in variables.items() if name not in external]
    first = ast.Expr(value=ast.Call(func=attr("GG", "program", "configure"), args=[ast.parse(_gg_json.dumps({"variables": configured}), mode="eval").body], keywords=[]))
    last = ast.Expr(value=ast.Await(value=ast.Call(func=attr("GG", "events", "run"), args=[], keywords=[])))
    for node, line in ((first, 1), (last, max(1, len(lines)))):
        for child in ast.walk(node): child.lineno = child.end_lineno = line; child.col_offset = child.end_col_offset = 0
    tree = ast.Module(body=[first] + module + [last], type_ignores=[])
    return compile(ast.fix_missing_locations(tree), "document.py", "exec", flags=_gg_ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True), True
`;
