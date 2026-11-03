"""Prueba en navegador real del formulario "Comprar Online" (con el servidor simulado).
Correr:  python3 tests/compra_online_navegador.py
Cubre: interruptor apagado (sigue por WhatsApp), pago listo (redirige), pedido rechazado,
pago no configurado y sin conexión (en ambos sigue por WhatsApp)."""
import json, subprocess, sys, time, threading, http.server, socketserver, functools, os, urllib.parse
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPA = 'https://nwuvosijrajznkcddmkn.supabase.co'
PRODUCTO = {'id': 'acc-test', 'code': 'ACC-T', 'name': 'Protector de prueba', 'brand': 'Marca', 'sector': 'armeria', 'category': 'accesorios',
            'subcategory': 'protectores-auditivos', 'price': 1500, 'stock': 5, 'published': True, 'regulated': False,
            'availability': 'disponible', 'condition': 'nuevo', 'offer_active': False, 'is_new': False}
CARRITO = [{'id': 'acc-test', 'name': 'Protector de prueba', 'qty': 2, 'priceSeen': 1500, 'availabilitySeen': 'disponible'}]
VISITANTE = {'id': 'v1', 'nombre': 'Juan', 'apellido': 'Pérez', 'telefono': '2215551234', 'email': 'juan@correo.com'}
DATOS = {'nombre': 'Juan Pérez', 'telefono': '2215551234', 'email': 'juan@correo.com', 'direccion': 'Calle 13 27', 'localidad': 'La Plata', 'cp': '1900', 'provincia': 'Buenos Aires'}

def servir():
    class Silencioso(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k): pass
    h = functools.partial(Silencioso, directory=RAIZ)
    s = socketserver.TCPServer(('127.0.0.1', 0), h); threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, s.server_address[1]

def caso(p, base, nombre, flag, respuesta_funcion):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script("window.__abiertas = []; window.open = (u) => { window.__abiertas.push(String(u)); return null; };")
    ctx.add_init_script(f"localStorage.setItem('parabellum-mayor-18', 'si'); localStorage.setItem('parabellum.visitante', {json.dumps(json.dumps(VISITANTE))}); localStorage.setItem('parabellum-cart-v2', {json.dumps(json.dumps(CARRITO))});")
    llamadas, abiertas = [], []
    def config(route):
        r = route.fetch(); t = r.text().replace('ONLINE_PAYMENT_ENABLED = false', f'ONLINE_PAYMENT_ENABLED = {str(flag).lower()}')
        route.fulfill(response=r, body=t)
    ctx.route('**/config.js*', config)
    ctx.route(f'{SUPA}/rest/v1/productos*', lambda r: r.fulfill(json=[PRODUCTO], headers={'access-control-allow-origin': '*'}))
    ctx.route(f'{SUPA}/rest/v1/**', lambda r: r.fulfill(json=[], headers={'access-control-allow-origin': '*'}) if 'productos' not in r.request.url else r.fallback())
    def funcion(route):
        if route.request.method == 'OPTIONS': return route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*'})
        llamadas.append(json.loads(route.request.post_data))
        if respuesta_funcion == 'caida': return route.abort()
        estado, cuerpo = respuesta_funcion
        route.fulfill(status=estado, json=cuerpo, headers={'access-control-allow-origin': '*'})
    ctx.route(f'{SUPA}/functions/v1/crear-pedido', funcion)
    ctx.route('https://pagos.ejemplo/**', lambda r: r.fulfill(body='<h1>Formulario de pago simulado</h1>', content_type='text/html'))
    ctx.route('https://wa.me/**', lambda r: r.fulfill(body='wa', content_type='text/html'))
    ctx.route('https://api.whatsapp.com/**', lambda r: r.fulfill(body='wa', content_type='text/html'))
    pg = ctx.new_page(); pg.goto(f'{base}/armeria.html?acceso=parabellum'); pg.wait_for_selector('[data-open-cart]')
    pg.click('[data-open-cart]'); pg.click('#onlineCheckout'); pg.wait_for_selector('#onlineForm', state='visible')
    for k, v in DATOS.items(): pg.fill(f'#onlineForm [name={k}]', v)
    pg.click('#onlineForm button[type=submit]'); time.sleep(4)
    try: abiertas = list(pg.evaluate('window.__abiertas || []'))
    except Exception: abiertas = []   # la página ya navegó a otro lado (caso de redirección)
    return b, pg, llamadas, abiertas

def main():
    srv, puerto = servir(); base = f'http://127.0.0.1:{puerto}'; fallos = []
    def verificar(ok, texto):
        print(('  ✔ ' if ok else '  ✘ ') + texto); (not ok) and fallos.append(texto)
    with sync_playwright() as p:
        print('Interruptor APAGADO'); b, pg, ll, ab = caso(p, base, 'apagado', False, (200, {'ok': True, 'pedido': 'x', 'pagoUrl': None}))
        verificar(len(ll) == 0, 'no llama al servidor'); verificar(any('wa.me' in a or 'whatsapp' in a for a in ab), 'abre WhatsApp como siempre'); b.close()

        print('Pago listo'); b, pg, ll, ab = caso(p, base, 'ok', True, (200, {'ok': True, 'pedido': 'abc12345', 'pagoUrl': 'https://pagos.ejemplo/form'}))
        verificar(len(ll) == 1 and ll[0]['items'] == [{'id': 'acc-test', 'qty': 2}], 'manda solo ids y cantidades (sin precios)')
        verificar('precio' not in json.dumps(ll[0]).lower() and 'price' not in json.dumps(ll[0]).lower(), 'el pedido no lleva ningún precio')
        verificar(pg.url.startswith('https://pagos.ejemplo/'), 'redirige al formulario de pago'); b.close()

        print('Pedido rechazado'); b, pg, ll, ab = caso(p, base, 'rech', True, (422, {'ok': False, 'error': 'carrito_invalido', 'errores': [{'codigo': 'regulado', 'detalle': 'Pistola: es material controlado.'}]}))
        txt = pg.inner_text('#onlineStatus'); verificar('Pistola: es material controlado.' in txt, 'muestra el motivo al cliente'); verificar(not ab, 'no abre WhatsApp'); b.close()

        print('Pago no configurado'); b, pg, ll, ab = caso(p, base, 'nc', True, (200, {'ok': True, 'pedido': 'abc12345', 'pagoUrl': None, 'motivo': 'no_configurado'}))
        verificar(any('whatsapp' in a or 'wa.me' in a for a in ab), 'sigue por WhatsApp'); b.close()

        print('Sin conexión al servidor'); b, pg, ll, ab = caso(p, base, 'caida', True, 'caida')
        verificar(any('whatsapp' in a or 'wa.me' in a for a in ab), 'sigue por WhatsApp'); b.close()

        print('Dirección de pago insegura'); b, pg, ll, ab = caso(p, base, 'js', True, (200, {'ok': True, 'pedido': 'x', 'pagoUrl': 'javascript:alert(1)'}))
        verificar(not pg.url.startswith('javascript') and any('whatsapp' in a or 'wa.me' in a for a in ab), 'ignora una dirección que no es https'); b.close()
    srv.shutdown()
    print('\n' + ('TODO OK' if not fallos else f'FALLARON {len(fallos)}')); sys.exit(1 if fallos else 0)

main()
