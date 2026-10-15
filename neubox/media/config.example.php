<?php
// Copia este archivo como config.php (en la misma carpeta que upload.php) y
// rellena los valores. config.php NO debe subirse a GitHub.

// La misma clave que la variable NEUBOX_UPLOAD_KEY del sitio en Cloudflare.
// Genera una larga y aleatoria, p.ej. con: openssl rand -hex 32
define('UPLOAD_KEY', 'PEGA_AQUI_UNA_CLAVE_ALEATORIA_DE_64_CARACTERES');

// URL pública de esta carpeta (donde está upload.php), sin "/" final.
define('PUBLIC_BASE_URL', 'https://tudominio.com/media');
