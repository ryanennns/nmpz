<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JoinQueueRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:' . config('game.max_name_length')],
        ];
    }
}
