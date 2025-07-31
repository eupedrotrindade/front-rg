import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'
export default function Page() {
    return (
        <div className='w-full min-h-screen flex flex-col justify-center items-center'>
            <Image src="/images/logo-rg-fone.png" alt="Logo RG" width={150} height={150} className='mb-8' />
            <h1 className='text-2xl font-bold mb-8'>
                Bem-vindo de volta!
            </h1>
            <SignIn
                appearance={{
                    variables: {
                        colorPrimary: "#7c3aed", // purple co
                    },
                }}
            />

        </div>
    )
}