import { useState } from 'react';
import type { Player } from '@/components/welcome/types';
import type { useUnauthedApiClient } from '@/hooks/useApiClient';
import type { User } from '@/types';
import AuthForm, { AuthField, getValidationErrors } from './AuthForm';

export default function SignUpForm({
    playerId,
    api,
    onSuccess,
    onBack,
}: {
    playerId: string;
    api: ReturnType<typeof useUnauthedApiClient>;
    onSuccess: (player: Player, user: User) => void;
    onBack: () => void;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [serverErrors, setServerErrors] = useState<Record<string, string[]>>(
        {},
    );

    const submit = async () => {
        const newErrors: Record<string, string[]> = {};
        if (!email) {
            newErrors.email = ['required'];
        }

        if (!password) {
            newErrors.password = ['required'];
        }

        if (password && password.length < 8) {
            newErrors.password = ['must be at least 8 characters'];
        }

        if (password !== passwordConfirmation) {
            newErrors.password_confirmation = ['passwords do not match'];
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setServerErrors({});
        try {
            const data = await api.claimPlayer(
                playerId,
                email,
                password,
                passwordConfirmation,
            );
            onSuccess(data.data.player as Player, data.data.user as User);
        } catch (err: unknown) {
            const validationErrors = getValidationErrors(err);
            if (validationErrors) {
                setServerErrors(validationErrors);
            }
        }
    };

    return (
        <AuthForm
            submitLabel="create account"
            onSubmit={submit}
            onBack={onBack}
        >
            <AuthField
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="email"
                error={errors.email?.[0]}
                serverError={serverErrors.email?.[0]}
            />
            <AuthField
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="password"
                error={errors.password?.[0]}
                serverError={serverErrors.password?.[0]}
            />
            <AuthField
                type="password"
                value={passwordConfirmation}
                onChange={setPasswordConfirmation}
                placeholder="confirm password"
                error={errors.password_confirmation?.[0]}
                serverError={serverErrors.password_confirmation?.[0]}
            />
        </AuthForm>
    );
}
