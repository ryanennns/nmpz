<?php

namespace App\Enums;

enum ReportReason: string
{
    case Inaccurate = 'inaccurate';
    case Inappropriate = 'inappropriate';
    case BadCoverage = 'bad coverage';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
