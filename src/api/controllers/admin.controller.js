const adminService = require('../../services/admin.service');

function evaluateFormula(formula) {
    if (typeof formula !== 'string' && typeof formula !== 'number') {
        throw new Error('Invalid formula type');
    }
    const str = String(formula).trim();
    if (!str) {
        throw new Error('Empty formula');
    }

    const tokens = [];
    let i = 0;
    while (i < str.length) {
        const ch = str[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if (/[0-9.]/.test(ch)) {
            let numStr = '';
            while (i < str.length && /[0-9.]/.test(str[i])) {
                numStr += str[i];
                i++;
            }
            if ((numStr.match(/\./g) || []).length > 1) {
                throw new Error('Invalid number format');
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
            continue;
        }
        if (['+', '-', '*', '/', '%', '(', ')'].includes(ch)) {
            tokens.push({ type: 'OP', value: ch });
            i++;
            continue;
        }
        throw new Error(`Unexpected character: ${ch}`);
    }

    let pos = 0;

    function parseExpression() {
        return parseAdditive();
    }

    function parseAdditive() {
        let left = parseMultiplicative();
        while (pos < tokens.length && (tokens[pos].value === '+' || tokens[pos].value === '-')) {
            const op = tokens[pos++].value;
            const right = parseMultiplicative();
            if (op === '+') left = left + right;
            else left = left - right;
        }
        return left;
    }

    function parseMultiplicative() {
        let left = parseUnary();
        while (pos < tokens.length && (tokens[pos].value === '*' || tokens[pos].value === '/' || tokens[pos].value === '%')) {
            const op = tokens[pos++].value;
            const right = parseUnary();
            if (op === '*') left = left * right;
            else if (op === '/') left = left / right;
            else if (op === '%') left = left % right;
        }
        return left;
    }

    function parseUnary() {
        if (pos < tokens.length && (tokens[pos].value === '+' || tokens[pos].value === '-')) {
            const op = tokens[pos++].value;
            const factor = parseUnary();
            return op === '-' ? -factor : factor;
        }
        return parsePrimary();
    }

    function parsePrimary() {
        if (pos >= tokens.length) {
            throw new Error('Unexpected end of input');
        }
        const token = tokens[pos++];
        if (token.type === 'NUMBER') {
            return token.value;
        }
        if (token.type === 'OP' && token.value === '(') {
            const expr = parseExpression();
            if (pos >= tokens.length || tokens[pos].value !== ')') {
                throw new Error('Mismatched parentheses');
            }
            pos++;
            return expr;
        }
        throw new Error(`Unexpected token: ${token.value}`);
    }

    const result = parseExpression();
    if (pos < tokens.length) {
        throw new Error('Unexpected extra tokens');
    }
    if (typeof result !== 'number' || Number.isNaN(result)) {
        throw new Error('Invalid calculation result');
    }
    return result;
}

exports.checkShippingStatus = (req, res) => {
    adminService.pingProvider(req.body.providerIP, req.body.options, out => res.send(out));
};

exports.previewDynamicPricing = (req, res) => {
    try {
        res.json({ price: evaluateFormula(req.body.formula) });
    } catch (e) {
        res.status(400).send("Evaluation Failed");
    }
};