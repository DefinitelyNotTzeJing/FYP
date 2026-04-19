<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    // Suppress PHP 8.5 deprecation of PDO::MYSQL_ATTR_SSL_CA emitted by
    // vendor/laravel/framework/config/database.php during app bootstrap.
    public function createApplication(): \Illuminate\Foundation\Application
    {
        set_error_handler(function (int $errno, string $errstr): bool {
            if ($errno === E_DEPRECATED && str_contains($errstr, 'MYSQL_ATTR_SSL_CA')) {
                return true;
            }
            return false;
        }, E_DEPRECATED);

        $app = parent::createApplication();

        restore_error_handler();

        return $app;
    }
}
