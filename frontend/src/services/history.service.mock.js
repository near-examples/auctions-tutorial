export const getInfo = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockData = [
        { amount: '$20,000', time: '01 Hr', account: "pepe.testnet" },
        { amount: '$26,560', time: '15 Min', account: "alice.testnet" },
        { amount: '$26,560', time: '15 Min', account: "bob.testnet" },
        { amount: '$26,800', time: '20 Sec', account: "mich.testnet" },
        { amount: '$38,728', time: '01 Sec', account: "scott.testnet" },
      ];

    return mockData;
};