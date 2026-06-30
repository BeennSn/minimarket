const USER_AGENT = 'MinimarketPOS/1.0 (contacto@minimarket.com)';
const TIMEOUT_MS = 8000;

const FUENTES = [
  'https://world.openfoodfacts.org',
  'https://world.openproductsfacts.org',
  'https://world.openbeautyfacts.org',
];

const headers = () => ({
  'User-Agent': USER_AGENT,
  Accept: 'application/json',
});

const normalizar = (product) => ({
  nombre: product.product_name ? product.product_name.trim() : null,
  marca: product.brands ? product.brands.split(',')[0].trim() : null,
  categorias_texto: product.categories || null,
  imagen_url: product.image_url || null,
});

const consultarFuente = async (baseUrl, codigo) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${baseUrl}/api/v2/product/${codigo}.json?fields=product_name,brands,categories,image_url,status`;
    const response = await fetch(url, { headers: headers(), signal: controller.signal });
    const data = await response.json();
    console.log(`[barcodeService] ${baseUrl} codigo=${codigo} status=${response.status} encontrado=${data.status === 1}`);

    if (!response.ok || data.status !== 1 || !data.product) {
      return { encontrado: false };
    }

    return { encontrado: true, data: normalizar(data.product) };
  } catch (err) {
    console.error(`[barcodeService] Error consultando ${baseUrl}:`, err.message);
    return { encontrado: false };
  } finally {
    clearTimeout(timeoutId);
  }
};

const buscarEnApisExternas = async (codigoBarras) => {
  for (const baseUrl of FUENTES) {
    const resultado = await consultarFuente(baseUrl, codigoBarras);
    if (resultado.encontrado) return resultado;
  }
  return { encontrado: false };
};

module.exports = { buscarEnApisExternas };
