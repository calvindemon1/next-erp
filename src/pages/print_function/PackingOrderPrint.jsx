import bgNavel from "../../assets/img/navelBackgroundPrint.jpg";

export default function PackingOrderPrint(props) {
  const data = props.data;

  return (
    <div
      class="text-sm font-sans min-h-[100vh] bg-no-repeat bg-cover bg-center"
      style={{
        "background-image": `url(${bgNavel})`,
        padding: "40px",
      }}
    >
      <h1 class="text-2xl font-bold mb-4">Packing Order</h1>
      <p>
        <strong>Tipe:</strong> {data.type}
      </p>
      <p>
        <strong>No. Sequence:</strong> {data.sequence_number}
      </p>
      <p>
        <strong>Sales Order:</strong> {data.sales_order_id}
      </p>
      <p>
        <strong>Col:</strong> {data.col}
      </p>
      <p>
        <strong>Catatan:</strong> {data.catatan}
      </p>

      {/* Tabel */}
      <table class="mt-6 w-full border border-gray-400 text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="border px-2 py-1">Item</th>
            <th class="border px-2 py-1">Roll</th>
            <th class="border px-2 py-1">Meter</th>
            <th class="border px-2 py-1">Yard</th>
          </tr>
        </thead>
        <tbody>
          {data.itemGroups.map((group, i) =>
            group.rolls.map((roll, j) => (
              <tr>
                <td class="border px-2 py-1">{group.sales_order_item_id}</td>
                <td class="border px-2 py-1">{j + 1}</td>
                <td class="border px-2 py-1">{roll.meter_total}</td>
                <td class="border px-2 py-1">{roll.yard_total}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
