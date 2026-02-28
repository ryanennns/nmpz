<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JoinQueueRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:' . config('game.max_name_length')],
            'map_id' => ['nullable', 'uuid', 'exists:maps,id'],
            'match_format' => ['nullable', 'string', 'in:classic,bo3,bo5,bo7,rush'],
        ];
    }
}
