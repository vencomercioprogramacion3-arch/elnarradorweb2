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

$folder = $_POST['folder'] ?? '';
if (!in_array($folder, ['news', 'magazines'], true)) {
    fail(400, 'Carpeta no válida.');
}

$name = $_POST['name'] ?? '';
$allowed = [
    'jpg'  => ['image/jpeg'],
    'png'  => ['image/png'],
    'webp' => ['image/webp'],
    'gif'  => ['image/gif'],
    'avif' => ['image/avif'],
    'pdf'  => ['application/pdf'],
];
if (!is_string($name) || !preg_match('/^[a-z0-9][a-z0-9._-]{0,180}\.(jpg|png|webp|gif|avif|pdf)$/', $name, $m)) {
    fail(400, 'Nombre de archivo no válido.');
}
$ext = $m[1];

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $code = $_FILES['file']['error'] ?? -1;
    if ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) {
        fail(413, 'El archivo supera el límite de subida del hosting (upload_max_filesize).');
    }
    fail(400, 'No se recibió el archivo (código ' . $code . ').');
}

$tmp = $_FILES['file']['tmp_name'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
// Algunos servidores no reconocen AVIF; aceptarlo si el contenedor es ISO-BMFF
if (!in_array($mime, $allowed[$ext], true) && !($ext === 'avif' && $mime === 'application/octet-stream')) {
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
