import { useState } from 'react';
import type { useUnauthedApiClient } from '@/hooks/useApiClient';
import AuthForm, { AuthField, getValidationErrors } from './AuthForm';

export default function SignInForm({
    api,
    onSuccess,
    onBack,
}: {
    api: ReturnType<typeof useUnauthedApiClient>;
    onSuccess: () => void;
    onBack: () => void;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const submit = async () => {
        setErrors({});
        try {
            await api.signIn(email, password);
            onSuccess();
        } catch (err: unknown) {
            const validationErrors = getValidationErrors(err);
            if (validationErrors) {
                setErrors(validationErrors);
            }
        }
    };

    return (
        <AuthForm submitLabel="sign in" onSubmit={submit} onBack={onBack}>
            <AuthField
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="email"
                error={errors.email?.[0]}
            />
            <AuthField
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="password"
                error={errors.password?.[0]}
            />
        </AuthForm>
    );
}
