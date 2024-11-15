const fs = require('fs').promises;
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

const apiBaseUrl = "https://gateway-run.bls.dev/api/v1";
const ipServiceUrl = "https://tight-block-2413.txlabs.workers.dev";
let useProxy;

async function loadFetch() {
    const fetch = await import('node-fetch').then(module => module.default);
    return fetch;
}

async function readProxies() {
    const data = await fs.readFile('proxy.txt', 'utf-8');
    const proxies = data.trim().split('\n').filter(proxy => proxy);
    return proxies;
}

async function readNodeAndHardwareIds() {
    const data = await fs.readFile('id.txt', 'utf-8');
    const ids = data.trim().split('\n').filter(id => id).map(id => {
        const [nodeId, hardwareId] = id.split(':');
        return { nodeId, hardwareId };
    });
    return ids;
}

async function readAuthToken() {
    const data = await fs.readFile('user.txt', 'utf-8');
    return data.trim();
}

async function promptUseProxy() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question('Do you want to use a proxy? (y/n): ', answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

async function fetchIpAddress(fetch, agent) {
    const response = await fetch(ipServiceUrl, { agent });
    const data = await response.json();
    console.log(`[${new Date().toISOString()}] IP fetch response:`, data);
    return data.ip;
}

async function registerNode(nodeId, hardwareId, ipAddress, proxy) {
    const fetch = await loadFetch();
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const registerUrl = `${apiBaseUrl}/nodes/${nodeId}`;
    console.log(`[${new Date().toISOString()}] Registering node with IP: ${ipAddress}, Hardware ID: ${hardwareId}`);
    const response = await fetch(registerUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
            ipAddress,
            hardwareId
        }),
        agent
    });

    let data;
    try {
        data = await response.json();
    } catch (error) {
        const text = await response.text();
        console.error(`[${new Date().toISOString()}] Failed to parse JSON. Response text:`, text);
        throw error;
    }

    console.log(`[${new Date().toISOString()}] Registration response:`, data);
    return data;
}

async function startSession(nodeId, proxy) {
    const fetch = await loadFetch();
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const startSessionUrl = `${apiBaseUrl}/nodes/${nodeId}/start-session`;
    console.log(`[${new Date().toISOString()}] Starting session for node ${nodeId}, it might take a while...`);

    const startSessions = async () => {
        const response = await fetch(startSessionUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            agent,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[${new Date().toISOString()}] Start session response:`, data);
        return data;
    };

    const retryWithCatch = async (fn, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                console.error(`[Attempt ${attempt}] Failed to start session:`, error.message || error);
                if (attempt === maxRetries) {
                    throw new Error("Exceeded maximum retry attempts.");
                }
            }
        }
    };

    return retryWithCatch(startSessions, 3);
}

async function pingNode(nodeId, proxy, ipAddress) {
    const fetch = await loadFetch();
    const chalk = await import('chalk');
    const authToken = await readAuthToken();
    let agent;

    if (proxy) {
        agent = new HttpsProxyAgent(proxy);
    }

    const pingUrl = `${apiBaseUrl}/nodes/${nodeId}/ping`;
    console.log(`[${new Date().toISOString()}] Pinging node ${nodeId} using proxy ${proxy}`);
    const response = await fetch(pingUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${authToken}`
        },
        agent
    });
    const data = await response.json();
    
    const lastPing = data?.pings?.[data?.pings?.length - 1]?.timestamp;
    const logMessage = `[${new Date().toISOString()}] Ping response, ID: ${chalk.default.green(data._id)}, NodeID: ${chalk.default.green(data.nodeId)}, Last Ping: ${chalk.default.yellow(lastPing)}, Proxy: ${proxy}, IP: ${ipAddress}`;
    console.log(logMessage);
    
    return data;
}

async function displayHeader() {
    const chalk = await import('chalk');
    console.log("");
    console.log(chalk.default.yellow(" ============================================"));
    console.log(chalk.default.yellow("|        Blockless Bless Network Bot         |"));
    console.log(chalk.default.yellow(" ============================================"));
    console.log("");
}

async function processNode(nodeId, hardwareId, proxy, ipAddress) {
    while (true) {
        try {
            console.log(`[${new Date().toISOString()}] Processing nodeId: ${nodeId}, hardwareId: ${hardwareId}, IP: ${ipAddress}`);
            
            const registrationResponse = await registerNode(nodeId, hardwareId, ipAddress, proxy);
            console.log(`[${new Date().toISOString()}] Node registration completed for nodeId: ${nodeId}. Response:`, registrationResponse);
            
            const startSessionResponse = await startSession(nodeId, proxy);
            console.log(`[${new Date().toISOString()}] Session started for nodeId: ${nodeId}. Response:`, startSessionResponse);
            
            console.log(`[${new Date().toISOString()}] Sending initial ping for nodeId: ${nodeId}`);
            await pingNode(nodeId, proxy, ipAddress);
            
            setInterval(async () => {
                try {
                    console.log(`[${new Date().toISOString()}] Sending ping for nodeId: ${nodeId}`);
                    await pingNode(nodeId, proxy, ipAddress);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Error during ping: ${error.message}`);
                    throw error;
                }
            }, 60000);
            
            break;

        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error occurred for nodeId: ${nodeId}, restarting process: ${error.message}`);
        }
    }
}

async function runAll(initialRun = true) {
    try {
        if (initialRun) {
            await displayHeader();
            useProxy = await promptUseProxy();
        }

        const ids = await readNodeAndHardwareIds();
        const proxies = await readProxies();

        if (useProxy && proxies.length !== ids.length) {
            throw new Error((await import('chalk')).default.yellow(`Number of proxies (${proxies.length}) does not match number of nodeId:hardwareId pairs (${ids.length})`));
        }

        for (let i = 0; i < ids.length; i++) {
            const { nodeId, hardwareId } = ids[i];
            const proxy = useProxy ? proxies[i] : null;
            const ipAddress = useProxy ? await fetchIpAddress(await loadFetch(), proxy ? new HttpsProxyAgent(proxy) : null) : null;

            processNode(nodeId, hardwareId, proxy, ipAddress);
        }
    } catch (error) {
        const chalk = await import('chalk');
        console.error(chalk.default.yellow(`[${new Date().toISOString()}] An error occurred: ${error.message}`));
    }
}

runAll();
