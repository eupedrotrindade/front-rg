import { SignIn } from '@clerk/nextjs'

export default function Page() {
    return (
        <div className='w-full min-h-screen flex flex-col justify-center items-center'>
            <SignIn></SignIn>

        </div>
    )
}