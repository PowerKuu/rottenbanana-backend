export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        console.log("Initializing instrumentation")

        const { main } = await import("./instrumentation-node")
        main()
    }
}
