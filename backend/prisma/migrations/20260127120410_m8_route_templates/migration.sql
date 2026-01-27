-- CreateTable
CREATE TABLE "RouteTemplate" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteTemplateStop" (
    "id" SERIAL NOT NULL,
    "routeTemplateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "StopType" NOT NULL DEFAULT 'COMMON',

    CONSTRAINT "RouteTemplateStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteTemplate_roomId_idx" ON "RouteTemplate"("roomId");

-- CreateIndex
CREATE INDEX "RouteTemplateStop_routeTemplateId_order_idx" ON "RouteTemplateStop"("routeTemplateId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RouteTemplateStop_routeTemplateId_order_key" ON "RouteTemplateStop"("routeTemplateId", "order");

-- AddForeignKey
ALTER TABLE "RouteTemplate" ADD CONSTRAINT "RouteTemplate_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTemplateStop" ADD CONSTRAINT "RouteTemplateStop_routeTemplateId_fkey" FOREIGN KEY ("routeTemplateId") REFERENCES "RouteTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
