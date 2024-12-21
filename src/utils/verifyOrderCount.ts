import * as fs from 'fs';

function countOrders() {
    try {
        const fileContent = fs.readFileSync('order_output.txt', 'utf8');
        const orderLines = fileContent.match(/^Order: .+$/gm);
        const orderCount = orderLines ? orderLines.length : 0;
        
        console.log('\n=== ORDER COUNT VERIFICATION ===');
        console.log(`Number of "Order:" lines found: ${orderCount}`);
        
        // Optional: Print each order number
        if (orderLines) {
            console.log('\nOrder Numbers:');
            orderLines.forEach((line, index) => {
                console.log(`${index + 1}. ${line.replace('Order: ', '')}`);
            });
        }
        
        console.log('----------------------------------------');
    } catch (error) {
        console.error('Error reading or parsing file:', error);
    }
}

countOrders(); 