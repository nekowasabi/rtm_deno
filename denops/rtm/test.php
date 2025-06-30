<?php

// 配列から奇数を抽出したい
$sample = [1, 2, 3, 4, 5, 6];

$result = array_filter($sample, function ($value) {
    return $value % 2 !== 0;
});

var_dump($result);

// fizzbuzz
function fizzbuzz ($n) {
    if ($n % 15 === 0) {
        return 'fizzbuzz';
    } elseif ($n % 3 === 0) {
        return 'fizz';
    } elseif ($n % 5 === 0) {
        return 'buzz';
    } else {
        return $n;
    }
}
