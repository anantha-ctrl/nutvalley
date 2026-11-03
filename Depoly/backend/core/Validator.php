<?php
/**
 * Tiny validation helper.
 * Rules: required, email, min:N, max:N, numeric, in:a,b,c, confirmed
 */
class Validator
{
    private array $errors = [];

    public function __construct(private array $data) {}

    public static function make(array $data, array $rules): self
    {
        $v = new self($data);
        $v->validate($rules);
        return $v;
    }

    public function validate(array $rules): void
    {
        foreach ($rules as $field => $ruleSet) {
            $rulesArr = is_array($ruleSet) ? $ruleSet : explode('|', $ruleSet);
            $value = $this->data[$field] ?? null;
            foreach ($rulesArr as $rule) {
                [$name, $param] = array_pad(explode(':', $rule, 2), 2, null);
                $this->applyRule($field, $value, $name, $param);
            }
        }
    }

    private function applyRule(string $field, $value, string $rule, ?string $param): void
    {
        $label = ucfirst(str_replace('_', ' ', $field));
        switch ($rule) {
            case 'required':
                if ($value === null || $value === '' || (is_array($value) && count($value) === 0)) {
                    $this->errors[$field][] = "$label is required";
                }
                break;
            case 'email':
                if ($value && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->errors[$field][] = "$label must be a valid email";
                }
                break;
            case 'min':
                if ($value !== null && strlen((string) $value) < (int) $param) {
                    $this->errors[$field][] = "$label must be at least $param characters";
                }
                break;
            case 'max':
                if ($value !== null && strlen((string) $value) > (int) $param) {
                    $this->errors[$field][] = "$label must be at most $param characters";
                }
                break;
            case 'numeric':
                if ($value !== null && $value !== '' && !is_numeric($value)) {
                    $this->errors[$field][] = "$label must be numeric";
                }
                break;
            case 'in':
                $opts = explode(',', (string) $param);
                if ($value !== null && !in_array((string) $value, $opts, true)) {
                    $this->errors[$field][] = "$label is invalid";
                }
                break;
            case 'confirmed':
                if (($this->data["{$field}_confirmation"] ?? null) !== $value) {
                    $this->errors[$field][] = "$label confirmation does not match";
                }
                break;
        }
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }
}
