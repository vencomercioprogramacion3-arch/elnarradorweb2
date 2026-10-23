<?php
/**
 * Recibe las imágenes y PDFs que sube el panel /admin de El Narrador y los
 * guarda en ./uploads/<carpeta>/. Devuelve JSON: {"url": "https://..."}.
 *
 * Solo acepta peticiones con la cabecera X-Upload-Key igual a UPLOAD_KEY
 * (definida en config.php, que NO se sube al repositorio).
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    fail(500, 'Falta config.php en el servidor.');
}
require $configFile;

if (!defined('UPLOAD_KEY') || strlen(UPLOAD_KEY) < 32 || !defined('PUBLIC_BASE_URL')) {
    fail(500, 'config.php incompleto (UPLOAD_KEY de 32+ caracteres y PUBLIC_BASE_URL).');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Método no permitido.');
}

$providedKey = $_SERVER['HTTP_X_UPLOAD_KEY'] ?? '';
if (!is_string($providedKey) || !hash_equals(UPLOAD_KEY, $providedKey)) {
    fail(401, 'No autorizado.');
}

$action = $_POST['action'] ?? 'upload';
if ($action === 'delete') {
    $folder = $_POST['folder'] ?? '';
    $urlsJson = $_POST['urls'] ?? '';
    $urls = is_string($urlsJson) ? json_decode($urlsJson, true) : null;
    if ($folder !== 'magazines' || !is_array($urls) || count($urls) > 2) {
        fail(400, 'Solicitud de eliminación no válida.');
    }

    $base = parse_url(PUBLIC_BASE_URL);
    if (
        !is_array($base) ||
        ($base['scheme'] ?? '') !== 'https' ||
        empty($base['host']) ||
        isset($base['user']) ||
        isset($base['pass']) ||
        isset($base['port']) ||
        isset($base['query']) ||
        isset($base['fragment'])
    ) {
        fail(500, 'PUBLIC_BASE_URL no es válida para eliminar archivos.');
    }

    $basePath = rtrim($base['path'] ?? '', '/');
    $expectedPrefix = $basePath . '/uploads/magazines/';
    $files = [];
    foreach ($urls as $url) {
        if (!is_string($url)) {
            fail(400, 'La dirección del archivo no es válida.');
        }
        $parsed = parse_url($url);
        $path = is_array($parsed) ? ($parsed['path'] ?? '') : '';
        $filename = strpos($path, $expectedPrefix) === 0
            ? substr($path, strlen($expectedPrefix))
            : '';

        if (
            !is_array($parsed) ||
            ($parsed['scheme'] ?? '') !== 'https' ||
            strtolower($parsed['host'] ?? '') !== strtolower($base['host']) ||
            isset($parsed['user']) ||
            isset($parsed['pass']) ||
            isset($parsed['port']) ||
            isset($parsed['query']) ||
            isset($parsed['fragment']) ||
            !preg_match('/^[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp|gif|avif|pdf)$/i', $filename)
        ) {
            fail(400, 'La dirección del archivo no pertenece a la carpeta de revistas.');
        }
        $files[$filename] = $filename;
    }

    $directory = realpath(__DIR__ . '/uploads/magazines');
    if ($directory === false) {
        fail(500, 'No se encontró la carpeta de revistas en el hosting.');
    }

    $deleted = [];
    $errors = [];
    foreach ($files as $filename) {
        $target = $directory . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($target)) {
            $deleted[] = rtrim(PUBLIC_BASE_URL, '/') . '/uploads/magazines/' . $filename;
            continue;
        }
        if (unlink($target)) {
            $deleted[] = rtrim(PUBLIC_BASE_URL, '/') . '/uploads/magazines/' . $filename;
        } else {
            $errors[] = 'No se pudo eliminar ' . $filename . '.';
        }
    }

    http_response_code($errors ? 500 : 200);
    echo json_encode(['deleted' => $deleted, 'errors' => $errors]);
    exit;
}

if ($action !== 'upload') {
    fail(400, 'Acción no válida.');
}

$folder = $_POST['folder'] ?? '';
if (!in_array($folder, ['news', 'magazines'], true)) {
    fail(400, 'Carpeta no válida.');
}

$name = $_POST['name'] ?? '';
$allowed = [
    'jpg'   => ['image/jpeg', 'image/jpg', 'image/pjpeg', 'application/octet-stream'],
    'jpeg'  => ['image/jpeg', 'image/jpg', 'image/pjpeg', 'application/octet-stream'],
    'png'   => ['image/png', 'image/x-png', 'application/octet-stream'],
    'webp'  => ['image/webp', 'application/octet-stream'],
    'gif'   => ['image/gif', 'application/octet-stream'],
    'avif'  => ['image/avif', 'application/octet-stream'],
    'pdf'   => ['application/pdf', 'application/octet-stream'],
];
if (!is_string($name) || !preg_match('/^[a-z0-9][a-z0-9._-]{0,180}\.(jpg|jpeg|png|webp|gif|avif|pdf)$/i', $name, $m)) {
    fail(400, 'Nombre de archivo no válido.');
}
$ext = strtolower($m[1]);

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $code = $_FILES['file']['error'] ?? -1;
    if ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) {
        fail(413, 'El archivo supera el límite de subida del hosting (upload_max_filesize).');
    }
    fail(400, 'No se recibió el archivo (código ' . $code . ').');
}

$tmp = $_FILES['file']['tmp_name'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);

$validSignature = false;
if ($ext === 'pdf') {
    $header = file_get_contents($tmp, false, null, 0, 5);
    $validSignature = is_string($header) && strncmp('%PDF-', $header, 5) === 0;
} elseif ($ext === 'png') {
    $header = file_get_contents($tmp, false, null, 0, 8);
    $validSignature = is_string($header) && strncmp("\x89PNG\r\n\x1a\n", $header, 8) === 0;
} elseif ($ext === 'gif') {
    $header = file_get_contents($tmp, false, null, 0, 6);
    $validSignature = is_string($header) && ($header === 'GIF87a' || $header === 'GIF89a');
} elseif ($ext === 'webp') {
    $header = file_get_contents($tmp, false, null, 0, 12);
    $validSignature = is_string($header) && substr($header, 0, 4) === 'RIFF' && substr($header, 8, 4) === 'WEBP';
} elseif ($ext === 'avif') {
    $header = file_get_contents($tmp, false, null, 0, 12);
    $validSignature = is_string($header) && substr($header, 4, 4) === 'ftyp';
} else {
    $header = file_get_contents($tmp, false, null, 0, 2);
    $validSignature = is_string($header) && $header[0] === '\xFF' && $header[1] === '\xD8';
}

if (!in_array($mime, $allowed[$ext], true) && !($validSignature && in_array($mime, ['application/octet-stream', 'application/x-empty'], true))) {
    fail(400, 'El contenido del archivo no coincide con su tipo (' . $mime . ').');
}

$dir = __DIR__ . '/uploads/' . $folder;
if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
    fail(500, 'No se pudo crear la carpeta de destino.');
}

$target = $dir . '/' . $name;
if (file_exists($target)) {
    fail(409, 'Ya existe un archivo con ese nombre.');
}
if (!move_uploaded_file($tmp, $target)) {
    fail(500, 'No se pudo guardar el archivo.');
}
chmod($target, 0644);

echo json_encode(['url' => rtrim(PUBLIC_BASE_URL, '/') . '/uploads/' . $folder . '/' . $name]);
