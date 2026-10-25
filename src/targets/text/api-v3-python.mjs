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

// 3D/web: API v3 → API2 (same semantics as generated-capability-source).
export const api3CapabilityPythonCompiler = String.raw`
import ast as _gg_cast, json as _gg_cjson
_GG_CAP_PRELUDE = '''
import math as gg_math
def gg_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not gg_math.isfinite(value) or abs(value) > 1000000:
        raise ValueError("Número fuera del dominio finito ±1e6")
    return value
def gg_seconds(value):
    value = gg_number(value)
    if value < 0 or value > 60:
        raise ValueError("Espera fuera de 0..60 segundos")
    return value
def gg_compare(op, left, right):
    numeric = lambda value: isinstance(value, (int, float)) and not isinstance(value, bool)
    same = (numeric(left) and numeric(right)) or type(left) is type(right)
    if op == "EQ": return same and left == right
    if not same or not (numeric(left) or isinstance(left, str)): raise ValueError("Comparación de tipos incompatibles")
    return left < right if op == "LT" else left > right
def gg_event(event, path):
    value = event
    for part in path.split("."):
        value = value[part]
    return value
'''

def _gg_api3_capability_compile(source, vocabulary_json, profile_json, variable_ids_json, target_ids_json):
    ast = _gg_cast
    vocabulary, profile = _gg_cjson.loads(vocabulary_json), _gg_cjson.loads(profile_json)
    variable_ids, targets = _gg_cjson.loads(variable_ids_json), _gg_cjson.loads(target_ids_json)
    py, namespace = vocabulary["python"], vocabulary["namespace"]
    compare = {ast.Eq: "EQ", ast.Lt: "LT", ast.Gt: "GT"}
    lines = source.splitlines()
    def fail(message, node):
        line = getattr(node, "lineno", 1)
        raise SyntaxError(message, ("document.py", line, getattr(node, "col_offset", 0) + 1, lines[line - 1] if 0 < line <= len(lines) else ""))
    def attr(*path):
        node = ast.Name(id=path[0], ctx=ast.Load())
        for part in path[1:]: node = ast.Attribute(value=node, attr=part, ctx=ast.Load())
        return node
    def call(func, *args): return ast.Call(func=func if not isinstance(func, str) else ast.Name(id=func, ctx=ast.Load()), args=list(args), keywords=[])
    def literal(value): return ast.parse(repr(value), mode="eval").body
    def number(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float, str, bool): return node.value, True
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub) and isinstance(node.operand, ast.Constant) and type(node.operand.value) in (int, float): return -node.operand.value, True
        return None, False
    variables, body = {}, []
    tree = ast.parse(source, "document.py", "exec")
    for statement in tree.body:
        if isinstance(statement, ast.Assign) and len(statement.targets) == 1 and isinstance(statement.targets[0], ast.Name):
            value, ok = number(statement.value)
            if ok:
                name = statement.targets[0].id
                if name in targets or name == namespace: fail("«" + name + "» ya nombra un objeto del contexto; elige otro nombre.", statement)
                kind = "boolean" if type(value) is bool else "string" if isinstance(value, str) else "number"
                variables[name] = {"id": variable_ids.get(name, name), "name": name, "type": kind, "initialValue": value}
                continue
        body.append(statement)
    def state(name): return ast.Subscript(value=ast.Name(id="gg_state", ctx=ast.Load()), slice=ast.Constant(variables[name]["id"]), ctx=ast.Load())
    def operation_of(node):
        if not isinstance(node, ast.Call): return None
        func = node.func
        if isinstance(func, ast.Name) and func.id == "wait": return ("wait", None, None)
        if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
            owner, method = func.value.id, func.attr
            if owner == namespace:
                if method not in py["global"]: fail(owner + " no tiene la acción " + method + ".", node)
                return ("operation", py["global"][method], None)
            if owner in targets and method not in py["events"]:
                if method not in py["targeted"]: fail(owner + " no tiene la acción " + method + ".", node)
                return ("operation", py["targeted"][method], targets[owner])
        return None
    def nested(paths_values, target):
        root = {}
        if target is not None: root["targetId"] = ast.Constant(target)
        for path, value in paths_values:
            cursor = root
            for key in path[:-1]: cursor = cursor.setdefault(key, {})
            cursor[path[-1]] = value
        def build(mapping): return ast.Dict(keys=[ast.Constant(key) for key in mapping], values=[build(value) if isinstance(value, dict) else value for value in mapping.values()])
        return build(root)
    class Handler(ast.NodeTransformer):
        def __init__(self, event_name): self.event_name = event_name
        def visit_FunctionDef(self, node):
            for child in ast.walk(node):
                if operation_of(child) is not None: fail("Las acciones del programa van directamente dentro de un evento, no dentro de funciones propias.", child)
            return node
        visit_AsyncFunctionDef = visit_FunctionDef
        visit_Lambda = visit_FunctionDef
        def visit_Global(self, node):
            rest = [name for name in node.names if name not in variables]
            return ast.copy_location(ast.Global(names=rest), node) if rest else None
        def visit_Call(self, node):
            found = operation_of(node)
            if found is None: return self.generic_visit(node)
            kind, operation, target = found
            node.args = [self.visit(arg) for arg in node.args]
            if kind == "wait":
                if len(node.args) != 1: fail("wait recibe 1 valor.", node)
                return ast.copy_location(ast.Await(value=call(attr("ctx", "wait"), call("gg_seconds", node.args[0]))), node)
            leaves = operation["leaves"]
            if len(node.args) != len(leaves) or node.keywords: fail(ast.unparse(node.func) + " recibe " + str(len(leaves)) + (" valor." if len(leaves) == 1 else " valores."), node)
            payload = nested([(leaf.split("."), arg) for leaf, arg in zip(leaves, node.args)], target)
            return ast.copy_location(ast.Await(value=call(attr("ctx", *operation["publicPath"]), payload)), node)
        def visit_Assign(self, node):
            if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name) and node.targets[0].id in variables:
                name, value = node.targets[0].id, self.visit(node.value)
                if variables[name]["type"] == "number": value = call("gg_number", value)
                target = state(name); target.ctx = ast.Store()
                return ast.copy_location(ast.Assign(targets=[target], value=value), node)
            return self.generic_visit(node)
        def visit_AugAssign(self, node):
            if isinstance(node.target, ast.Name) and node.target.id in variables:
                name = node.target.id
                if variables[name]["type"] != "number" or not isinstance(node.op, (ast.Add, ast.Sub)): fail("Usa = con " + name + ".", node)
                target = state(name); target.ctx = ast.Store()
                value = call("gg_number", ast.BinOp(left=call("gg_number", state(name)), op=node.op, right=call("gg_number", self.visit(node.value))))
                return ast.copy_location(ast.Assign(targets=[target], value=value), node)
            return self.generic_visit(node)
        def visit_If(self, node):
            test = node.test
            if isinstance(test, ast.Compare) and len(test.ops) == 1 and type(test.ops[0]) in compare:
                node.test = ast.copy_location(call("gg_compare", ast.Constant(compare[type(test.ops[0])]), self.visit(test.left), self.visit(test.comparators[0])), test)
            else: node.test = self.visit(test)
            node.body = [item for item in (self.visit(child) for child in node.body) if item is not None] or [ast.Pass()]
            node.orelse = [item for item in (self.visit(child) for child in node.orelse) if item is not None]
            return node
        def visit_Subscript(self, node):
            base = node.value
            if self.event_name and isinstance(base, ast.Attribute) and base.attr == "values" and isinstance(base.value, ast.Name) and base.value.id == self.event_name and isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
                return ast.copy_location(call("gg_event", ast.Name(id="event", ctx=ast.Load()), ast.Constant("values." + node.slice.value)), node)
            return self.generic_visit(node)
        def visit_Attribute(self, node):
            if self.event_name and isinstance(node.value, ast.Name) and node.value.id == self.event_name:
                if node.attr in ("value", "key", "targetId"): return ast.copy_location(call("gg_event", ast.Name(id="event", ctx=ast.Load()), ast.Constant(node.attr)), node)
                if node.attr != "values": fail("Usa event.value, event.key, event.targetId o event.values[\"id\"].", node)
            return self.generic_visit(node)
        def visit_Name(self, node):
            if node.id in variables and isinstance(node.ctx, ast.Load): return ast.copy_location(state(node.id), node)
            if node.id in targets or node.id == namespace: fail("Usa " + node.id + " con una de sus acciones.", node)
            return node
    module, registered = [], 0
    for statement in body:
        event = None
        if isinstance(statement, ast.FunctionDef) and len(statement.decorator_list) == 1:
            decorator = statement.decorator_list[0]
            head = decorator.func if isinstance(decorator, ast.Call) else decorator
            if isinstance(head, ast.Name) and head.id in py["events"] and not py["events"][head.id].get("target"): event, owner = py["events"][head.id], None
            elif isinstance(head, ast.Attribute) and isinstance(head.value, ast.Name) and head.value.id in targets and head.attr in py["events"] and py["events"][head.attr].get("target"): event, owner = py["events"][head.attr], targets[head.value.id]
        if event is None:
            for child in ast.walk(statement):
                if operation_of(child) is not None: fail("Las acciones del programa van dentro de un evento, como @on_start.", child)
            module.append(statement); continue
        options = decorator.args if isinstance(decorator, ast.Call) else []
        if event.get("option") and not (len(options) == 1 and isinstance(options[0], ast.Constant) and isinstance(options[0].value, str)): fail("El evento recibe un texto entre comillas.", decorator)
        params = statement.args.args
        if len(params) > 1 or statement.args.vararg or statement.args.kwarg or statement.args.kwonlyargs: fail("La función del evento recibe como mucho un parámetro: event.", statement)
        event_name = params[0].arg if params else None
        inner = [self_body for self_body in (Handler(event_name).visit(child) for child in statement.body) if self_body is not None] or [ast.Pass()]
        if event_name and event_name != "event": inner = [ast.Assign(targets=[ast.Name(id=event_name, ctx=ast.Store())], value=ast.Name(id="event", ctx=ast.Load()))] + inner
        handler = ast.copy_location(ast.AsyncFunctionDef(name=statement.name, args=ast.arguments(posonlyargs=[], args=[ast.arg(arg="ctx"), ast.arg(arg="event")], kwonlyargs=[], kw_defaults=[], defaults=[]), body=inner, decorator_list=[], returns=None, type_params=[]), statement)
        registration = {"event": event["id"], "targetId": owner}
        if event.get("option"): registration["key"] = options[0].value
        register = ast.copy_location(ast.Expr(value=call(attr("GG", "context", "when"), literal(registration), ast.Name(id=statement.name, ctx=ast.Load()))), statement)
        module += [handler, register]
        registered += 1
    if not registered and not variables:
        return compile(source, "document.py", "exec", flags=_gg_cast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True), False
    head = ast.parse(_GG_CAP_PRELUDE).body
    head.append(ast.Assign(targets=[ast.Name(id="gg_state", ctx=ast.Store())], value=literal({item["id"]: item["initialValue"] for item in variables.values()})))
    head.append(ast.Expr(value=call(attr("GG", "context", "configure"), literal({"contextId": profile["contextId"], "documentId": profile["documentId"], "variables": list(variables.values())}))))
    tail = [ast.Expr(value=ast.Await(value=call(attr("GG", "context", "activate"))))]
    for node, line in [(item, 1) for item in head] + [(tail[0], max(1, len(lines)))]:
        for child in ast.walk(node):
            if hasattr(child, "lineno") or isinstance(child, (ast.expr, ast.stmt)):
                child.lineno = child.end_lineno = line; child.col_offset = child.end_col_offset = 0
    tree = ast.Module(body=head + module + tail, type_ignores=[])
    return compile(ast.fix_missing_locations(tree), "document.py", "exec", flags=_gg_cast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True), True
`;
